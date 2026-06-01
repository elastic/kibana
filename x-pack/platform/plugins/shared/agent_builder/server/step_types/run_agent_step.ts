/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ServiceManager } from '../services';
import {
  CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW,
  resolveConnectorOrInferenceId,
} from '../../common/resolve_connector_or_inference_id';
import { runAgentStepCommonDefinition } from '../../common/step_types/run_agent_step';
import { buildWaitingForInputResult } from './helpers/build_waiting_for_input_result';
import { resumeInnerAgent } from './helpers/resume_inner_agent';
import { runInnerAgent } from './helpers/run_inner_agent';

/**
 * Server step definition for the "ai.agent" step.
 * This step executes an agentBuilder agent using the execution service.
 */
export const getRunAgentStepDefinition = (
  serviceManager: ServiceManager,
  workflowsManagement?: WorkflowsServerPluginSetup,
  inboxEnabled = false,
  logger?: Logger
) => {
  return createServerStepDefinition({
    ...runAgentStepCommonDefinition,
    handler: async (context) => {
      try {
        const {
          schema,
          message,
          conversation_id: conversationIdFromInput,
          attachments,
        } = context.input;

        const {
          'agent-id': agentId,
          'connector-id': connectorIdRaw,
          'inference-id': inferenceIdRaw,
          'create-conversation': createConversation,
        } = context.config;

        context.logger.debug('ai.agent step started');

        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new Error('No request available in workflow context');
        }

        const effectiveAgentId = (agentId as string | undefined) || agentBuilderDefaultAgentId;
        context.logger.debug(
          `[hitl-debug][ab] runAgent.start stepId=${
            context.stepId
          } agentId=${effectiveAgentId} isResuming=${context.isResuming ?? false}`
        );
        const effectiveConnectorId = resolveConnectorOrInferenceId(
          { connectorId: connectorIdRaw, inferenceId: inferenceIdRaw },
          CONNECTOR_OR_INFERENCE_ID_CONFLICT_MESSAGE_WORKFLOW
        );

        const executionService = serviceManager.internalStart?.execution;
        if (!executionService) {
          throw new Error('execution service is not available');
        }

        // Resume path: inner workflow was paused; resume it then re-run the agent
        if (inboxEnabled && context.isResuming) {
          context.logger.debug(
            `[hitl-debug][ab] runAgent.resume stepId=${context.stepId} agentId=${effectiveAgentId}`
          );
          const conversations = serviceManager.internalStart?.conversations;
          const conversationClient = conversations
            ? await conversations.getScopedClient({ request })
            : undefined;
          return resumeInnerAgent({
            abortSignal: context.abortSignal,
            agentId: effectiveAgentId,
            connectorId: effectiveConnectorId,
            conversationClient,
            conversationIdFromInput,
            createConversation,
            executionService,
            logger,
            nextInput: { attachments, message },
            request,
            resumeInput: context.resumeInput ?? {},
            schema,
            spaceId: context.contextManager.getContext().workflow.spaceId,
            stepState: (context.stepState ?? {}) as Record<string, unknown>,
            workflowApi: workflowsManagement?.management,
          });
        }

        // Initial run path
        context.logger.debug('Executing ai.agent step', { agentId: effectiveAgentId });

        const storeConversation = createConversation || Boolean(conversationIdFromInput);

        const { outputConversationId, outputMessage, round } = await runInnerAgent({
          abortSignal: context.abortSignal,
          executionService,
          params: {
            agentId: effectiveAgentId,
            autoCreateConversationWithId: createConversation,
            connectorId: effectiveConnectorId,
            conversationId: conversationIdFromInput,
            nextInput: { attachments, message },
            outputSchema: schema,
            storeConversation,
            structuredOutput: !!schema,
          },
          request,
          schema,
          storeConversation,
        });

        if (inboxEnabled) {
          const waitingResult = buildWaitingForInputResult({
            logger: context.logger,
            outputConversationId,
            round,
          });
          if (waitingResult !== null) {
            context.logger.debug(
              `[hitl-debug][ab] runAgent.awaitingPrompt stepId=${
                context.stepId
              } schemaPresent=${!!waitingResult.waitingForInput
                ?.schema} messagePresent=${!!waitingResult.waitingForInput?.message}`
            );
            return waitingResult;
          }
        }

        return {
          output: {
            message: outputMessage,
            structured_output: round.response.structured_output,
            ...(outputConversationId && { conversation_id: outputConversationId }),
          },
        };
      } catch (error) {
        context.logger.error(
          'agentBuilder.runAgent step failed',
          error instanceof Error ? error : new Error(String(error))
        );
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    },
  });
};
