/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSpanContextValid, trace } from '@opentelemetry/api';
import { ByteSizeValue } from '@kbn/config-schema';
import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type { ConnectorTelemetryMetadata } from '@kbn/inference-common';
import {
  isTemplateRequiredConnector,
  MessageRole,
  parseTemplateJson,
  validateReasoningEffort,
} from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import {
  normalizeConnectorFeatureIds,
  resolveConnectorIdFromFeatures,
} from '@kbn/search-inference-endpoints/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE,
  AiPromptStepCommonDefinition,
  normalizeOptionalConnectorParam,
} from '../../../../common/steps/ai';
import type { InferenceWorkflowsStartDeps } from '../../../types';
import { AI_PROMPT_FEATURE_ID } from '../ai_feature_ids';
import { resolveConnectorId } from '../utils/resolve_connector_id';

interface MessageWithUsage {
  response_metadata?: Record<string, unknown>;
  usage_metadata?: {
    input_tokens: number;
    output_tokens: number;
    input_token_details?: { cache_read?: number };
  };
}

/**
 * The model's response metadata plus the token usage and connector under `usage`, the shape the
 * workflow engine reads (`output.metadata.usage`). The inference chat model reports tokens on the
 * message's `usage_metadata`, not in `response_metadata`, so without this the step's usage is lost.
 */
const buildMetadata = (
  { response_metadata: responseMetadata = {}, usage_metadata: usage }: MessageWithUsage,
  connectorId: string
): Record<string, unknown> => {
  if (!usage) return responseMetadata;
  const cachedTokens = usage.input_token_details?.cache_read;
  return {
    ...responseMetadata,
    usage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      ...(cachedTokens !== undefined ? { cachedTokens } : {}),
      connectorId,
    },
  };
};

/**
 * Parses a `max-step-size` value (e.g. `"10mb"` or a raw byte count) into bytes, the same way the
 * ai.agent step does. Returns `undefined` for empty or malformed values so the limit is not changed.
 */
export const parseMaxStepSize = (value: string | undefined): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return ByteSizeValue.parse(trimmed).getValueInBytes();
  } catch {
    return undefined;
  }
};

/**
 * When the connector requires an EIS template, call chat completion directly.
 * Returns undefined so the caller keeps the messages path.
 */
const completePromptWithTemplate = async ({
  inference,
  request,
  connectorId,
  templateId,
  templateVersion,
  templateVariables,
  schema,
  abortSignal,
  telemetryMetadata,
}: {
  inference: InferenceServerStart | undefined;
  request: KibanaRequest;
  connectorId: string;
  templateId: string | undefined;
  templateVersion: number | undefined;
  templateVariables: Record<string, unknown>;
  schema: unknown;
  abortSignal?: AbortSignal;
  telemetryMetadata?: ConnectorTelemetryMetadata;
}): Promise<{ content: unknown; metadata: Record<string, unknown> } | undefined> => {
  if (!inference?.getClient) {
    if (templateId) {
      throw new Error('Inference is not available, so the prompt template cannot be sent');
    }
    return undefined;
  }

  // A messages call does not need the connector list. A template-only connector
  // with no template fields fails at the gateway.
  if (!templateId) {
    return undefined;
  }

  const client = inference.getClient({ request });
  let templateRequired = false;
  try {
    const connector = await client.getConnectorById(connectorId);
    templateRequired = isTemplateRequiredConnector(connector);
  } catch (error) {
    if (templateId) {
      throw error;
    }
    return undefined;
  }

  if (!templateRequired) {
    return undefined;
  }

  if (templateVersion == null) {
    throw new Error(
      `Connector "${connectorId}" requires a prompt template and cannot be called with messages`
    );
  }

  const response = await client.chatComplete({
    connectorId,
    stream: false,
    messages: [{ role: MessageRole.User, content: '' }],
    template: { id: templateId, version: templateVersion, variables: templateVariables },
    abortSignal,
    ...(telemetryMetadata ? { metadata: { connectorTelemetry: telemetryMetadata } } : {}),
  });

  const promptTokens = response.tokens?.prompt ?? 0;
  const completionTokens = response.tokens?.completion ?? 0;
  const content = schema ? parseTemplateJson(response.content) : response.content;

  return {
    content,
    metadata: {
      usage: {
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        ...(response.tokens?.cached !== undefined ? { cachedTokens: response.tokens.cached } : {}),
        connectorId,
      },
    },
  };
};

export const aiPromptStepDefinition = (coreSetup: CoreSetup<InferenceWorkflowsStartDeps>) =>
  createServerStepDefinition({
    ...AiPromptStepCommonDefinition,
    handler: async (context) => {
      const [, { inference, searchInferenceEndpoints }] = await coreSetup.getStartServices();

      const featureIds = normalizeConnectorFeatureIds(context.config['connector-id-by-feature']);
      const connectorId = normalizeOptionalConnectorParam(context.config['connector-id']);
      const pluginId = normalizeOptionalConnectorParam(context.config['plugin-id']);
      const aggregateBy = normalizeOptionalConnectorParam(context.config['aggregate-by']);
      // Workflows only validate the config schema's shape, which drops its refinements.
      if (aggregateBy && !pluginId) {
        throw new Error(AGGREGATE_BY_REQUIRES_PLUGIN_ID_MESSAGE);
      }
      const request = context.contextManager.getFakeRequest();

      const connectorIdFromFeatures = await resolveConnectorIdFromFeatures({
        featureIds,
        request,
        searchInferenceEndpoints,
        hasExplicitConnector: connectorId !== undefined,
        conflictMessage:
          'Cannot specify both connector-id and connector-id-by-feature on an ai.prompt step.',
      });
      const resolvedConnectorId =
        connectorIdFromFeatures ??
        (await resolveConnectorId(connectorId, inference, request, {
          featureId: AI_PROMPT_FEATURE_ID,
          searchInferenceEndpoints,
        }));

      const reasoningLevel = context.config['reasoning-level'];
      const maxContentLength = parseMaxStepSize(context.config['max-step-size']);
      // Sent only with a plugin-id, so a step without one makes exactly the same call as before.
      let telemetryMetadata: ConnectorTelemetryMetadata | undefined;
      if (pluginId) {
        const { execution, workflow } = context.contextManager.getContext();
        const productSolution = normalizeOptionalConnectorParam(context.config['product-solution']);
        const productFeature = normalizeOptionalConnectorParam(context.config['product-feature']);
        // Without tracing enabled the active span is a no-op whose trace id is all zeros.
        const spanContext = trace.getActiveSpan()?.spanContext();
        const traceId =
          spanContext && isSpanContextValid(spanContext) ? spanContext.traceId : undefined;
        telemetryMetadata = {
          pluginId,
          ...(aggregateBy ? { aggregateBy } : {}),
          ...(productSolution ? { productSolution } : {}),
          ...(productFeature ? { productFeature } : {}),
          interactionId: execution.id,
          spaceId: workflow.spaceId,
          ...(traceId ? { traceId } : {}),
        };
      }
      const templateResult = await completePromptWithTemplate({
        inference,
        request,
        connectorId: resolvedConnectorId,
        templateId: normalizeOptionalConnectorParam(context.input.template_id),
        templateVersion: context.input.template_version,
        templateVariables: context.input.template_variables ?? {},
        schema: context.input.schema,
        abortSignal: context.abortSignal,
        telemetryMetadata,
      });
      if (templateResult) {
        return { output: templateResult };
      }

      const chatModel = await inference.getChatModel({
        connectorId: resolvedConnectorId,
        request: context.contextManager.getFakeRequest(),
        chatModelOptions: {
          temperature: context.input.temperature,
          maxRetries: 0,
          ...(reasoningLevel !== undefined ? { reasoning: { effort: reasoningLevel } } : {}),
          ...(maxContentLength !== undefined ? { maxContentLength } : {}),
          ...(telemetryMetadata ? { telemetryMetadata } : {}),
        },
      });

      if (reasoningLevel !== undefined) {
        validateReasoningEffort(chatModel.getConnector(), reasoningLevel);
      }

      const modelInput = [
        ...(context.input.systemPrompt
          ? [{ role: 'system', content: context.input.systemPrompt }]
          : []),
        {
          role: 'user',
          content: context.input.prompt,
        },
      ];

      if (context.input.schema) {
        const runnable = chatModel.withStructuredOutput(
          {
            type: 'object',
            properties: {
              // withStructuredOutput fails if outputSchema is not an object.
              // for example, if the user expects an array, we wrap it into an object here
              // and then unwrap it below
              response: context.input.schema,
            },
          },
          {
            name: 'extract_structured_response',
            includeRaw: true,
            method: 'jsonMode',
          }
        );

        const invocationResult = await runnable.invoke(modelInput, {
          signal: context.abortSignal,
        });
        return {
          // We modify the output to match the expected schema
          // For now, structured output flow does not output response_metadata,
          // so we only return the content here, but looking ahead we might have response_metadata returned,
          // so we keep the same output structure with potential response_metadata addition in the future.
          output: {
            content: invocationResult.parsed.response,
            metadata: buildMetadata(invocationResult.raw, resolvedConnectorId),
          },
        };
      }

      const invocationResult = await chatModel.invoke(modelInput, {
        signal: context.abortSignal,
      });

      return {
        output: {
          content: invocationResult.content,
          metadata: buildMetadata(invocationResult, resolvedConnectorId),
        },
      };
    },
  });
