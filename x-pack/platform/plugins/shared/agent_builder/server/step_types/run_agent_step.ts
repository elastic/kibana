/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  createNonInteractiveConfig,
  ConversationAccessControlMode,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  isRoundCompleteEvent,
  toAutoApprovedApis,
  AgentExecutionMode,
} from '@kbn/agent-builder-common';
import type { KibanaRequest } from '@kbn/core/server';
import { ByteSizeValue } from '@kbn/config-schema';
import { isTemplateRequiredConnector, MessageRole } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { resolveExplicitFeatureConnectorId } from '@kbn/search-inference-endpoints/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { firstValueFrom, tap, toArray } from 'rxjs';
import type { ServiceManager } from '../services';
import {
  CONNECTOR_ID_BY_FEATURE_CONFLICT_MESSAGE_WORKFLOW,
  CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW,
  ConnectorOrInferenceIdConflictError,
  resolveConnectorOrInferenceId,
} from '../../common/resolve_connector_or_inference_id';
import { normalizeOptionalStringParam } from '../../common/normalize_optional_string_param';
import {
  EPHEMERAL_WITH_CREATE_CONVERSATION_MESSAGE,
  runAgentStepCommonDefinition,
} from '../../common/step_types/run_agent_step';
import { resolveConnectorIdByFeature } from '../utils/resolve_connector_id_by_feature';

const parseTemplateJson = (content: string): unknown => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? content).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('Template response did not contain a JSON object');
  }
  return JSON.parse(candidate.slice(start, end + 1));
};

/**
 * When the connector requires an EIS template, call chat completion directly.
 * Returns undefined so the caller keeps the agent path.
 */
const completeWithPromptTemplate = async ({
  inference,
  request,
  connectorId,
  templateId,
  templateVersion,
  templateVariables,
  schema,
  abortSignal,
}: {
  inference: InferenceServerStart | undefined;
  request: KibanaRequest;
  connectorId: string | undefined;
  templateId: string | undefined;
  templateVersion: number | undefined;
  templateVariables: Record<string, unknown>;
  schema: unknown;
  abortSignal?: AbortSignal;
}): Promise<
  | {
      message: string;
      structuredOutput: unknown;
      usage: {
        connectorId?: string;
        inputTokens: number;
        outputTokens: number;
        cachedTokens: number;
        totalTokens: number;
      };
    }
  | undefined
> => {
  if (!connectorId || !inference) {
    if (templateId) {
      throw new Error('Inference is not available, so the prompt template cannot be sent');
    }
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

  if (!templateId || templateVersion == null) {
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
  });

  const structuredOutput = schema ? parseTemplateJson(response.content) : undefined;
  const promptTokens = response.tokens?.prompt ?? 0;
  const completionTokens = response.tokens?.completion ?? 0;

  return {
    message: schema ? JSON.stringify(structuredOutput) : response.content,
    structuredOutput,
    usage: {
      connectorId,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      cachedTokens: response.tokens?.cached ?? 0,
      totalTokens: response.tokens?.total ?? promptTokens + completionTokens,
    },
  };
};

/**
 * Parses a `max-step-size` value (e.g. `"10mb"`, `"1gb"`, or a raw byte count) into bytes,
 * reusing Kibana's shared `ByteSizeValue` parser for consistency with the rest of the platform.
 * Returns `undefined` for empty or malformed values so the caller simply skips the override.
 */
export const parseMaxStepSize = (value: string): number | undefined => {
  const trimmed = value.trim();
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
 * Server step definition for the "ai.agent" step.
 * This step executes an agentBuilder agent using the execution service.
 */
export const getRunAgentStepDefinition = (serviceManager: ServiceManager) => {
  return createServerStepDefinition({
    ...runAgentStepCommonDefinition,
    handler: async (context) => {
      // Accumulate token usage outside the try/catch so partial counts are
      // preserved even if the event stream errors mid-execution.
      const usage: {
        connectorId?: string;
        inputTokens: number;
        outputTokens: number;
        cachedTokens: number;
        totalTokens: number;
      } = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0 };

      try {
        const {
          schema,
          message,
          conversation_id: conversationId,
          attachments,
          metadata,
          configuration_overrides: configurationOverrides,
          approvals,
          template_id: templateIdRaw,
          template_version: templateVersionRaw,
          template_variables: templateVariables,
        } = context.input;

        const {
          'agent-id': agentId,
          'connector-id': connectorIdRaw,
          'inference-id': inferenceIdRaw,
          'connector-id-by-feature': connectorIdByFeatureRaw,
          'explicit-connector-feature-id': explicitConnectorFeatureIdRaw,
          'create-conversation': createConversation,
          'public-conversation': publicConversation,
          ephemeral,
          'plugin-id': pluginId,
          'aggregate-by': aggregateBy,
          'product-solution': productSolution,
          'product-feature': productFeature,
          'max-step-size': maxStepSize,
          'reasoning-level': reasoningLevel,
        } = context.config;
        // Workflows only validate the config schema's shape, which drops its refinements.
        if (ephemeral && createConversation) {
          throw new Error(EPHEMERAL_WITH_CREATE_CONVERSATION_MESSAGE);
        }
        const maxContentLength =
          typeof maxStepSize === 'string' ? parseMaxStepSize(maxStepSize) : undefined;

        context.logger.debug('ai.agent step started');
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new Error('No request available in workflow context');
        }

        const effectiveAgentId = (agentId as string | undefined) || agentBuilderDefaultAgentId;
        let effectiveConnectorId = resolveConnectorOrInferenceId(
          { connectorId: connectorIdRaw, inferenceId: inferenceIdRaw },
          CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW
        );

        const explicitConnectorFeatureId = normalizeOptionalStringParam(
          explicitConnectorFeatureIdRaw
        );
        let explicitOverride = false;
        if (explicitConnectorFeatureId !== undefined) {
          const { searchInferenceEndpoints } = serviceManager.internalStart ?? {};
          if (searchInferenceEndpoints) {
            const explicitConnectorId = await resolveExplicitFeatureConnectorId({
              featureId: explicitConnectorFeatureId,
              request,
              searchInferenceEndpoints,
            });
            if (explicitConnectorId) {
              effectiveConnectorId = explicitConnectorId;
              explicitOverride = true;
            }
          }
        }

        const connectorIdByFeature = normalizeOptionalStringParam(connectorIdByFeatureRaw);
        if (!explicitOverride && connectorIdByFeature !== undefined) {
          if (effectiveConnectorId !== undefined) {
            throw new ConnectorOrInferenceIdConflictError(
              CONNECTOR_ID_BY_FEATURE_CONFLICT_MESSAGE_WORKFLOW
            );
          }
          const { searchInferenceEndpoints } = serviceManager.internalStart ?? {};
          if (!searchInferenceEndpoints) {
            throw new Error('searchInferenceEndpoints service is not available');
          }
          effectiveConnectorId = await resolveConnectorIdByFeature({
            featureId: connectorIdByFeature,
            request,
            searchInferenceEndpoints,
          });
        }

        const templateResult = await completeWithPromptTemplate({
          inference: serviceManager.internalStart?.inference,
          request,
          connectorId: effectiveConnectorId,
          templateId: normalizeOptionalStringParam(templateIdRaw),
          templateVersion: templateVersionRaw,
          templateVariables: templateVariables ?? {},
          schema,
          abortSignal: context.abortSignal,
        });
        if (templateResult) {
          return {
            output: {
              message: templateResult.message,
              structured_output: templateResult.structuredOutput,
              metadata: { usage: { ...usage, ...templateResult.usage } },
            },
          };
        }

        const storeConversation = !ephemeral && (createConversation || Boolean(conversationId));
        const accessControl = publicConversation
          ? { access_mode: ConversationAccessControlMode.Public }
          : undefined;

        const executionService = serviceManager.internalStart?.execution;
        if (!executionService) {
          throw new Error('execution service is not available');
        }

        context.logger.debug('Executing ai.agent step', {
          agentId: effectiveAgentId,
        });

        const { events$ } = await executionService.executeAgent({
          mode: AgentExecutionMode.conversation,
          request,
          abortSignal: context.abortSignal,
          metadata,
          interactive: createNonInteractiveConfig(
            approvals?.auto_approved_apis && toAutoApprovedApis(approvals.auto_approved_apis)
          ),
          params: {
            agentId: effectiveAgentId,
            connectorId: effectiveConnectorId,
            conversationId,
            autoCreateConversationWithId: createConversation,
            storeConversation,
            accessControl,
            structuredOutput: !!schema,
            outputSchema: schema,
            configurationOverrides,
            nextInput: {
              message,
              attachments,
            },
            ...(maxContentLength !== undefined ? { maxContentLength } : {}),
            ...(reasoningLevel !== undefined ? { reasoningLevel } : {}),
            // The single source of the workflow run: the execution reports it on its round events
            // and sends it to EIS as `interactionId`, with or without a `plugin-id`.
            workflowExecutionId: context.contextManager.getContext().execution.id,
            ...(pluginId
              ? {
                  telemetryMetadata: {
                    pluginId,
                    aggregateBy,
                    productSolution,
                    productFeature,
                  },
                }
              : {}),
          },
          // workflows already run as scheduled tasks
          useTaskManager: false,
        });

        const events = await firstValueFrom(
          events$.pipe(
            tap((event) => {
              if (isRoundCompleteEvent(event)) {
                const { model_usage: modelUsage } = event.data.round;
                if (modelUsage) {
                  // 'unknown' is the sentinel for a round that made no LLM call
                  // (see add_round_complete_event.ts). A step uses one connector
                  // today, so the last real value is the step's connector.
                  if (modelUsage.connector_id && modelUsage.connector_id !== 'unknown') {
                    usage.connectorId = modelUsage.connector_id;
                  }
                  usage.inputTokens += modelUsage.input_tokens;
                  usage.outputTokens += modelUsage.output_tokens;
                  usage.cachedTokens += modelUsage.cached_input_tokens ?? 0;
                  usage.totalTokens += modelUsage.input_tokens + modelUsage.output_tokens;
                }
              }
            }),
            toArray()
          )
        );

        const roundEvent = events.find(isRoundCompleteEvent);
        if (!roundEvent) {
          throw new Error('No round_complete event received from execution service');
        }

        const round = roundEvent.data.round;
        const outputMessage = schema
          ? JSON.stringify(round.response.structured_output)
          : round.response.message;

        let outputConversationId: string | undefined;
        if (storeConversation) {
          const conversationEvent = events.find(
            (e) => isConversationCreatedEvent(e) || isConversationUpdatedEvent(e)
          );
          if (!conversationEvent) {
            throw new Error('No conversation_created / conversation_updated event received');
          }
          outputConversationId = conversationEvent.data.conversation_id;
        }

        return {
          output: {
            message: outputMessage,
            structured_output: round.response.structured_output,
            ...(outputConversationId && { conversation_id: outputConversationId }),
            metadata: { usage },
          },
        };
      } catch (error) {
        context.logger.error(
          'agentBuilder.runAgent step failed',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          output: { message: '', metadata: { usage } },
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });
};
