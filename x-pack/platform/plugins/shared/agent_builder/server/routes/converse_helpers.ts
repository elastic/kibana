/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { createBadRequestError, AgentExecutionMode } from '@kbn/agent-builder-common';
import type {
  AgentExecutionService,
  ExecutionConversationOrigin,
} from '@kbn/agent-builder-server/execution';
import {
  ConnectorOrInferenceIdConflictError,
  resolveConnectorOrInferenceId,
} from '../../common/resolve_connector_or_inference_id';
import type { ChatRequestBodyPayload } from '../../common/http_api/chat';
import type { ChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';
import { validateToolSelection } from '../services/agents/persisted/client/utils/tools';
import { validateSkillIds } from '../services/agents/persisted/client/utils/skills';
import type { RouteDependencies } from './types';

export interface ResolvedExecutionOptions {
  useTaskManager: boolean | undefined;
  origin: ExecutionConversationOrigin | undefined;
  callback: { url: string } | undefined;
  executionId: string | undefined;
  metadata: Record<string, string> | undefined;
}

/**
 * Converse helpers shared by the legacy `/api/agent_builder/converse` routes and the
 * events-native `/api/chat/converse` routes.
 */
export const getConverseHelpers = ({
  getInternalServices,
}: Pick<RouteDependencies, 'getInternalServices'>) => {
  const validateAction = (payload: ChatRequestBodyPayload) => {
    if (payload.action === 'regenerate' && !payload.conversation_id) {
      throw createBadRequestError('conversation_id is required when action is regenerate');
    }
  };

  const resolveConnectorIdFromPayload = (payload: ChatRequestBodyPayload): string | undefined => {
    try {
      return resolveConnectorOrInferenceId({
        connectorId: payload.connector_id,
        inferenceId: payload.inference_id,
      });
    } catch (e) {
      if (e instanceof ConnectorOrInferenceIdConflictError) {
        throw createBadRequestError(e.message);
      }
      throw e;
    }
  };

  const validateConfigurationOverrides = async ({
    payload,
    request,
  }: {
    payload: ChatRequestBodyPayload;
    request: KibanaRequest;
  }) => {
    if (payload.configuration_overrides?.tools) {
      const { tools: toolsService } = getInternalServices();
      const toolRegistry = await toolsService.getRegistry({ request });
      const errors = await validateToolSelection({
        toolRegistry,
        request,
        toolSelection: payload.configuration_overrides.tools,
      });
      if (errors.length > 0) {
        throw createBadRequestError(`Invalid tool override: ${errors.join(', ')}`);
      }
    }
    if (payload.configuration_overrides?.skill_ids) {
      const { skills: skillsService } = getInternalServices();
      const skillRegistry = await skillsService.getRegistry({ request });
      const errors = await validateSkillIds(
        skillRegistry,
        payload.configuration_overrides.skill_ids
      );
      if (errors.length > 0) {
        throw createBadRequestError(`Invalid skill override: ${errors.join(', ')}`);
      }
    }
  };

  const defaultExecutionOptions = (payload: ChatRequestBodyPayload): ResolvedExecutionOptions => {
    const { _execution_mode: executionMode, execution_id: executionId } = payload;

    return {
      useTaskManager:
        executionMode === 'task_manager' ? true : executionMode === 'local' ? false : undefined,
      origin: undefined,
      callback: undefined,
      executionId,
      metadata: undefined,
    };
  };

  const executeAgent = async ({
    payload,
    request,
    executionService,
    executionOptions,
  }: {
    payload: ChatRequestBodyPayload | ChatCallbackRequestBodyPayload;
    request: KibanaRequest;
    executionService: AgentExecutionService;
    executionOptions?: ResolvedExecutionOptions;
  }) => {
    const {
      agent_id: agentId,
      conversation_id: conversationId,
      input,
      prompts,
      attachments,
      access_control: accessControl,
      read_only: readOnly,
      browser_api_tools: browserApiTools,
      configuration_overrides: configurationOverrides,
      action,
      project_routing: projectRouting,
    } = payload;

    const connectorId = resolveConnectorIdFromPayload(payload);
    const { useTaskManager, origin, callback, executionId, metadata } =
      executionOptions ?? defaultExecutionOptions(payload);

    return executionService.executeAgent({
      mode: AgentExecutionMode.conversation,
      request,
      executionId,
      metadata,
      useTaskManager,
      params: {
        agentId,
        connectorId,
        conversationId,
        autoCreateConversationWithId: true,
        accessControl,
        readOnly,
        origin,
        callback,
        browserApiTools,
        configurationOverrides,
        action,
        projectRouting,
        nextInput: {
          message: input,
          prompts,
          attachments,
        },
      },
    });
  };

  return { validateAction, validateConfigurationOverrides, executeAgent };
};
