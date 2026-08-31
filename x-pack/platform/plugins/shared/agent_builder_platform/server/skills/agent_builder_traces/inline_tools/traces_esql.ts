/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { generateEsql } from '@kbn/agent-builder-genai-utils';
import {
  createErrorResult,
  getToolResultId,
  type ToolHandlerResult,
} from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { buildAgentBuilderTracesIndexPattern } from '@kbn/agent-builder-plugin/common/traces';

export const AGENT_BUILDER_TRACES_ESQL_INLINE_TOOL_ID = 'agent-builder-traces.generate_esql';

const tracesEsqlSchema = z.object({
  prompt: z
    .string()
    .max(1024)
    .describe(
      'Natural language question about Agent Builder OTel traces (token usage, latency, tool calls, errors, or captured message content).'
    ),
});

const buildTracesQueryRules = (tracesIndex: string) =>
  `
This is a set of rules that you must follow strictly when generating ES|QL for Agent Builder trace spans:
* Use ONLY this index: ${tracesIndex} — do not use a traces-agent_builder.otel-* wildcard or query any other index.
* Always constrain the time range with @timestamp to the window the user asked about (default to the last 24 hours when they do not specify one).
* LLM / token usage spans: span.name LIKE "chat *"
* Tool call spans: span.name LIKE "execute_tool *"
* Conversation turn spans: span.name LIKE "invoke_agent *" AND attributes.elastic.inference.span.kind == "CHAIN"
* Agent execution spans: span.name LIKE "invoke_agent *" AND attributes.elastic.inference.span.kind == "AGENT"
* Token fields live on chat spans only — filter with span.name LIKE "chat *" before aggregating attributes.gen_ai.usage.input_tokens / attributes.gen_ai.usage.output_tokens (wrap in TO_LONG(...) before SUM).
* Model: attributes.gen_ai.request.model
* Provider: attributes.gen_ai.provider.name (do not use attributes.gen_ai.system)
* Agent id: attributes.gen_ai.agent.id
* Conversation id: attributes.gen_ai.conversation.id
* duration is in nanoseconds — divide by 1000000000.0 for seconds
* status.code == "Error" marks failed spans
* For percentage calculations, multiply by 100.0 before dividing (e.g. ROUND((total - errors) * 100.0 / total, 2)) to avoid integer division
* Message content (user prompts, LLM responses, system prompts, tool results) lives on chat spans (span.name LIKE "chat *") as JSON-string attributes, not on a separate logs index:
  - attributes.gen_ai.input.messages — chat history sent to the model (user prompts and prior assistant/tool turns). Requires agentBuilder:tracing:includeUserPrompts / includeLlmResponses / includeToolDetails for the respective roles.
  - attributes.gen_ai.output.messages — the model's response(s). Requires agentBuilder:tracing:includeLlmResponses.
  - attributes.gen_ai.system_instructions — system prompt. Requires agentBuilder:tracing:includeSystemPrompt.
* These attributes are JSON strings (arrays of { role, parts:[...] }); message text is not indexed as individual fields, so KEEP the whole attribute and let the caller parse it. Do not invent an attributes.content field.
* Prefer compact STATS aggregations over returning raw spans unless the user asked for individual span details or message text
`.trim();

export const createTracesEsqlTool = (): BuiltinSkillBoundedTool<typeof tracesEsqlSchema> => ({
  id: AGENT_BUILDER_TRACES_ESQL_INLINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Generate and execute ES|QL against the current space Agent Builder OTel traces index ' +
    '(span telemetry and captured message content). Scopes queries to the active Kibana space automatically.',
  schema: tracesEsqlSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ prompt }, context) => {
    const { esClient, events, modelProvider, logger, spaceId } = context;
    const tracesIndex = buildAgentBuilderTracesIndexPattern(spaceId);
    const additionalContext = buildTracesQueryRules(tracesIndex);

    try {
      const model = await modelProvider.getDefaultModel();
      const esqlResponse = await generateEsql({
        model,
        logger,
        events,
        nlQuery: prompt,
        esClient: esClient.asCurrentUser,
        index: tracesIndex,
        additionalContext,
      });

      if (esqlResponse.error) {
        return {
          results: [
            createErrorResult({
              message: esqlResponse.error,
            }),
          ],
        };
      }

      const results: ToolHandlerResult[] = [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            message: `Agent Builder traces index for this space: ${tracesIndex}.`,
          },
        },
      ];

      if (esqlResponse.query) {
        results.push({
          tool_result_id: getToolResultId(),
          type: ToolResultType.query,
          data: {
            esql: esqlResponse.query,
          },
        });
      }

      if (esqlResponse.answer) {
        results.push({
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            answer: esqlResponse.answer,
          },
        });
      }

      return { results };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to query Agent Builder traces: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
});
