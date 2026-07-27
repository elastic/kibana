/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { api } from '@elastic/opentelemetry-node/sdk';
import { resources, tracing } from '@elastic/opentelemetry-node/sdk';
import {
  GenAISemanticConventions,
  parseJsonAttr,
  type GenAIInputMessage,
  type GenAIOutputMessage,
  type GenAIMessagePart,
} from '@kbn/inference-tracing';
import { isInternalTool } from '@kbn/agent-builder-common/tools';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import {
  AGENT_BUILDER_BUILTIN_AGENTS,
  AGENT_BUILDER_BUILTIN_TOOLS,
} from '@kbn/agent-builder-server/allow_lists';
import { DATA_STREAM_NAMESPACE_ATTR, isAgentBuilderSpan } from './agent_builder_context';
import { normalizeAgentIdForTelemetry, toHashedId } from '../telemetry/utils';

const BUILTIN_TOOL_IDS: Set<string> = new Set(AGENT_BUILDER_BUILTIN_TOOLS);
const BUILTIN_AGENT_IDS: Set<string> = new Set([
  agentBuilderDefaultAgentId,
  ...AGENT_BUILDER_BUILTIN_AGENTS,
]);

const SHOULD_TRACK_ATTR = '_agent_builder_should_track';

export interface TracingPrivacySettings {
  enabled: boolean;
  includeUserPrompts: boolean;
  includeLlmResponses: boolean;
  includeToolDetails: boolean;
  includeSystemPrompt: boolean;
  includeRealNames: boolean;
  includeRealIds: boolean;
}

interface AgentBuilderSpanProcessorOpts {
  exporter: tracing.SpanExporter;
  scheduledDelayMillis: number;
  getSettings: () => TracingPrivacySettings;
}

/**
 * Hashes security-sensitive identifiers on span attributes before export.
 * Built-in agent IDs are kept in plain text; user-owned IDs are hashed
 * using the same scheme as EBT telemetry (SHA-256, 16-char hex prefix).
 */
function hashSensitiveAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
  const result = { ...attributes };

  const agentId = result[GenAISemanticConventions.GenAIAgentId];
  if (agentId != null) {
    result[GenAISemanticConventions.GenAIAgentId] = normalizeAgentIdForTelemetry(String(agentId));
  }

  const conversationId = result[GenAISemanticConventions.GenAIConversationId];
  if (conversationId != null) {
    result[GenAISemanticConventions.GenAIConversationId] = toHashedId(String(conversationId));
  }

  const workflowId = result['elastic.workflow.id'];
  if (workflowId != null) {
    result['elastic.workflow.id'] = toHashedId(String(workflowId));
  }

  const workflowExecId = result['elastic.workflow.execution_id'];
  if (workflowExecId != null) {
    result['elastic.workflow.execution_id'] = toHashedId(String(workflowExecId));
  }

  return result;
}

/**
 * Replaces user-created tool, agent, and workflow names with 'custom' to avoid
 * leaking user-chosen identifiers. Built-in tools and agents keep their real names.
 * `gen_ai.tool.definitions` and `gen_ai.tool.description` are stripped entirely
 * because they embed arbitrary tool names and descriptions as free-form text/JSON
 * that cannot be selectively anonymized.
 * Returns the anonymized attributes and the (possibly rewritten) span name.
 */
function anonymizeNames(
  attributes: Record<string, unknown>,
  spanName: string
): { attributes: Record<string, unknown>; spanName: string } {
  const {
    [GenAISemanticConventions.GenAIToolDefinitions]: _defs,
    [GenAISemanticConventions.GenAIToolDescription]: _desc,
    ...result
  } = attributes;
  let finalSpanName = spanName;

  const agentName = result[GenAISemanticConventions.GenAIAgentName];
  if (agentName != null) {
    const agentId = result[GenAISemanticConventions.GenAIAgentId];
    const isBuiltin = agentId != null && BUILTIN_AGENT_IDS.has(String(agentId));
    result[GenAISemanticConventions.GenAIAgentName] = isBuiltin ? agentName : 'custom';
    if (!isBuiltin) {
      if (finalSpanName.startsWith('invoke_agent')) {
        finalSpanName = `invoke_agent custom`;
      }
    }
  }

  const toolName = result[GenAISemanticConventions.GenAIToolName];
  if (toolName != null) {
    const isBuiltin = BUILTIN_TOOL_IDS.has(String(toolName)) || isInternalTool(String(toolName));
    result[GenAISemanticConventions.GenAIToolName] = isBuiltin ? toolName : 'custom';
    if (!isBuiltin) {
      if (finalSpanName.startsWith('execute_tool')) {
        finalSpanName = `execute_tool custom`;
      }
    }
  }
  const workflowName = result[GenAISemanticConventions.GenAIWorkflowName];
  if (workflowName != null) {
    result[GenAISemanticConventions.GenAIWorkflowName] = 'custom';

    if (finalSpanName.startsWith('invoke_workflow')) {
      finalSpanName = `invoke_workflow custom`;
    }
  }

  return { attributes: result, spanName: finalSpanName };
}

/**
 * Strips tool call I/O (arguments and result) from attributes to avoid leaking
 * the content of tool calls and their results.
 */
function stripToolCallIO(attributes: Record<string, unknown>): Record<string, unknown> {
  const {
    [GenAISemanticConventions.GenAIToolCallArguments]: _args,
    [GenAISemanticConventions.GenAIToolCallResult]: _result,
    ...rest
  } = attributes;
  return rest;
}

function isToolCallPart(part: GenAIMessagePart): part is GenAIMessagePart & { type: 'tool_call' } {
  return part.type === 'tool_call';
}

function anonymizeToolNamesInParts(parts: GenAIMessagePart[]): GenAIMessagePart[] {
  return parts.map((part) => {
    if (isToolCallPart(part)) {
      const name = part.name;
      const isBuiltin = BUILTIN_TOOL_IDS.has(name) || isInternalTool(name);
      return isBuiltin ? part : { ...part, name: 'custom' };
    }
    return part;
  });
}

function stripToolCallPartsFromMessages<T extends GenAIInputMessage | GenAIOutputMessage>(
  msgs: T[]
): T[] {
  return msgs.map((msg) => ({
    ...msg,
    parts: msg.parts.filter((part) => part.type !== 'tool_call'),
  }));
}

/**
 * Applies privacy settings to the structured message attributes (v1.37.0+ schema).
 * Modifies `gen_ai.system_instructions`, `gen_ai.input.messages`, and
 * `gen_ai.output.messages` in-place on the attributes object, returning a new copy.
 */
function applyMessageAttributePrivacy(
  attributes: Record<string, unknown>,
  settings: TracingPrivacySettings
): Record<string, unknown> {
  const result = { ...attributes };

  if (!settings.includeSystemPrompt) {
    delete result[GenAISemanticConventions.GenAISystemInstructions];
  }

  if (!settings.includeUserPrompts) {
    const msgs = parseJsonAttr<GenAIInputMessage[]>(
      result[GenAISemanticConventions.GenAIInputMessages]
    );
    if (msgs) {
      const filtered = msgs.filter((m) => m.role !== 'user');
      result[GenAISemanticConventions.GenAIInputMessages] = JSON.stringify(filtered);
    }
  }

  if (!settings.includeLlmResponses) {
    delete result[GenAISemanticConventions.GenAIOutputMessages];
    const msgs = parseJsonAttr<GenAIInputMessage[]>(
      result[GenAISemanticConventions.GenAIInputMessages]
    );
    if (msgs) {
      const filtered = msgs.filter((m) => m.role !== 'assistant');
      result[GenAISemanticConventions.GenAIInputMessages] = JSON.stringify(filtered);
    }
  }

  if (!settings.includeToolDetails) {
    const msgs = parseJsonAttr<GenAIInputMessage[]>(
      result[GenAISemanticConventions.GenAIInputMessages]
    );
    if (msgs) {
      const withoutToolMsgs = msgs.filter((m) => m.role !== 'tool');
      const stripped = stripToolCallPartsFromMessages(withoutToolMsgs);
      result[GenAISemanticConventions.GenAIInputMessages] = JSON.stringify(stripped);
    }

    const outputMsgs = parseJsonAttr<GenAIOutputMessage[]>(
      result[GenAISemanticConventions.GenAIOutputMessages]
    );
    if (outputMsgs) {
      result[GenAISemanticConventions.GenAIOutputMessages] = JSON.stringify(
        stripToolCallPartsFromMessages(outputMsgs)
      );
    }
  }

  if (!settings.includeRealNames) {
    const msgs = parseJsonAttr<GenAIInputMessage[]>(
      result[GenAISemanticConventions.GenAIInputMessages]
    );
    if (msgs) {
      const anonymized = msgs.map((msg) => ({
        ...msg,
        parts: anonymizeToolNamesInParts(msg.parts),
      }));
      result[GenAISemanticConventions.GenAIInputMessages] = JSON.stringify(anonymized);
    }

    const outputMsgs = parseJsonAttr<GenAIOutputMessage[]>(
      result[GenAISemanticConventions.GenAIOutputMessages]
    );
    if (outputMsgs) {
      const anonymized = outputMsgs.map((msg) => ({
        ...msg,
        parts: anonymizeToolNamesInParts(msg.parts),
      }));
      result[GenAISemanticConventions.GenAIOutputMessages] = JSON.stringify(anonymized);
    }
  }

  return result;
}

/**
 * Span processor that exports Agent Builder inference spans.
 */
export class AgentBuilderSpanProcessor implements tracing.SpanProcessor {
  private readonly batchProcessor: tracing.SpanProcessor;
  private readonly getSettings: () => TracingPrivacySettings;

  constructor(opts: AgentBuilderSpanProcessorOpts) {
    this.batchProcessor = new tracing.BatchSpanProcessor(opts.exporter, {
      scheduledDelayMillis: opts.scheduledDelayMillis,
    });
    this.getSettings = opts.getSettings;
  }

  async onStart(span: tracing.Span, parentContext: api.Context): Promise<void> {
    const settings = this.getSettings();
    if (!settings.enabled) {
      return;
    }
    if (isAgentBuilderSpan(span, parentContext)) {
      span.setAttribute(SHOULD_TRACK_ATTR, true);
      this.batchProcessor.onStart(span, parentContext);
    }
  }

  onEnd(span: tracing.ReadableSpan): void {
    if (!span.attributes[SHOULD_TRACK_ATTR]) {
      return;
    }

    const settings = this.getSettings();
    if (!settings.enabled) {
      return;
    }

    const {
      [SHOULD_TRACK_ATTR]: _,
      _should_track: __,
      [DATA_STREAM_NAMESPACE_ATTR]: namespace,
      ...cleanAttributes
    } = span.attributes;

    let processedAttributes: Record<string, unknown> = settings.includeRealIds
      ? cleanAttributes
      : hashSensitiveAttributes(cleanAttributes);

    processedAttributes = settings.includeToolDetails
      ? processedAttributes
      : stripToolCallIO(processedAttributes);

    processedAttributes = applyMessageAttributePrivacy(processedAttributes, settings);

    const { attributes: finalAttributes, spanName: finalSpanName } = settings.includeRealNames
      ? { attributes: processedAttributes, spanName: span.name }
      : anonymizeNames(processedAttributes, span.name);

    const datasetResource = resources.resourceFromAttributes({
      'data_stream.dataset': 'agent_builder',
      ...(typeof namespace === 'string' ? { [DATA_STREAM_NAMESPACE_ATTR]: namespace } : {}),
    });

    const exportSpan: tracing.ReadableSpan = Object.create(span, {
      resource: {
        value: span.resource.merge(datasetResource),
        enumerable: true,
      },
      name: {
        value: finalSpanName,
        enumerable: true,
      },
      attributes: {
        value: finalAttributes,
        enumerable: true,
      },
    });

    this.batchProcessor.onEnd(exportSpan);
  }

  forceFlush(): Promise<void> {
    return this.batchProcessor.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.batchProcessor.shutdown();
  }
}
