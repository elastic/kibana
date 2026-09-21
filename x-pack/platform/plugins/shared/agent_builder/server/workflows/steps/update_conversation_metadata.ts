/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  updateConversationMetadataStepCommonDefinition,
  type UpdateConversationMetadataStepInput,
} from '../../../common/workflows/steps/update_conversation_metadata';
import { createConversationPublicClient } from '../../services/conversation/conversation_public_client';
import type { ConversationStepDeps } from '../registry';

export const updateConversationMetadataStepDefinition = ({
  getConversationClient,
  getAgentRegistry,
  isExperimentalEnabled,
}: ConversationStepDeps) =>
  createServerStepDefinition({
    ...updateConversationMetadataStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        if (!(await isExperimentalEnabled(request))) {
          return {
            error: new Error(
              'Conversation metadata steps require experimental features to be enabled'
            ),
          };
        }
        const [client, agentRegistry] = await Promise.all([
          getConversationClient(request),
          getAgentRegistry(request),
        ]);
        const publicClient = createConversationPublicClient({ client, agentRegistry });
        const input = context.input as UpdateConversationMetadataStepInput;

        const { conversation, changedFields } = await publicClient.patchMetadata(
          input.conversation_id,
          input.updates
        );

        return {
          output: {
            conversation_id: input.conversation_id,
            changed_fields: changedFields,
            metadata: (conversation.metadata ?? {}) as Record<string, unknown>,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
