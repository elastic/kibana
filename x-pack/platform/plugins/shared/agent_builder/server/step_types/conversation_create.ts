/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  createConversationAlreadyExistsError,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { conversationCreateStepCommonDefinition } from '../../common/step_types/conversation_create';
import type { ServiceManager } from '../services';
import { toConversationStepError } from './conversation_step_error';
import { getConversationClient } from './get_conversation_client';

export const getConversationCreateStepDefinition = (serviceManager: ServiceManager) =>
  createServerStepDefinition({
    ...conversationCreateStepCommonDefinition,
    handler: async (context) => {
      const {
        agent_id: agentId,
        conversation_id: conversationId,
        title,
        access_mode: accessMode,
      } = context.input;

      try {
        const { client, request } = await getConversationClient(
          serviceManager,
          context.contextManager
        );
        const effectiveAgentId = agentId || agentBuilderDefaultAgentId;

        // Binding a conversation to an agent the executing user cannot use would grant
        // indirect access to it, so gate on the same check the conversations API applies.
        const agents = serviceManager.internalStart?.agents;
        if (!agents) {
          throw new Error('agents service is not available');
        }
        const agentRegistry = await agents.getRegistry({ request });
        await agentRegistry.get(effectiveAgentId, { access: 'use' });

        if (conversationId && (await client.exists(conversationId))) {
          throw createConversationAlreadyExistsError({ conversationId });
        }

        const conversation = await client.create({
          agent_id: effectiveAgentId,
          id: conversationId,
          title: title || DEFAULT_CONVERSATION_TITLE,
          ...(accessMode ? { access_control: { access_mode: accessMode, entries: [] } } : {}),
          rounds: [],
        });

        return { output: conversation };
      } catch (error) {
        throw toConversationStepError(error);
      }
    },
  });
