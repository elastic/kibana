/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  updateConversationMetadataStepCommonDefinition,
  type UpdateConversationMetadataStepInput,
} from '../../../common/workflows/steps/update_conversation_metadata';
import type { ConversationClient } from '../../services/conversation/client';

export const updateConversationMetadataStepDefinition = (
  getConversationClient: (request: KibanaRequest) => Promise<ConversationClient>,
  isExperimentalEnabled: (request: KibanaRequest) => Promise<boolean>
) =>
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
        const client = await getConversationClient(request);
        const input = context.input as UpdateConversationMetadataStepInput;

        const { conversation, changedFields } = await client.patchMetadata(
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
