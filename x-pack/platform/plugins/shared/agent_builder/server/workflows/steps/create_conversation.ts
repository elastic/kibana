/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  createConversationStepCommonDefinition,
  type CreateConversationStepInput,
} from '../../../common/workflows/steps/create_conversation';
import { createConversationPublicClient } from '../../services/conversation/conversation_public_client';
import type { ConversationStepDeps } from '../registry';

export const createConversationStepDefinition = ({
  getConversationClient,
  getAgentRegistry,
}: ConversationStepDeps) =>
  createServerStepDefinition({
    ...createConversationStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const [client, agentRegistry] = await Promise.all([
          getConversationClient(request),
          getAgentRegistry(request),
        ]);
        const publicClient = createConversationPublicClient({ client, agentRegistry });

        const input = context.input as CreateConversationStepInput;

        const conversation = await publicClient.create({
          agentId: input.agent_id,
          id: input.conversation_id,
          title: input.title,
          accessControl: input.access_control,
          templateId: input.template_id,
          metadata: input.metadata,
        });

        return {
          output: {
            conversation_id: conversation.id,
            agent_id: conversation.agent_id,
            ...(conversation.template_id ? { template_id: conversation.template_id } : {}),
            metadata: (conversation.metadata ?? {}) as Record<string, unknown>,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
