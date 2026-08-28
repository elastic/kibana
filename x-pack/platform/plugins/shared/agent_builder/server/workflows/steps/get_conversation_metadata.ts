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
  getConversationMetadataStepCommonDefinition,
  type GetConversationMetadataStepInput,
} from '../../../common/workflows/steps/get_conversation_metadata';
import type { ConversationClient } from '../../services/conversation/client';

export const getConversationMetadataStepDefinition = (
  getConversationClient: (request: KibanaRequest) => Promise<ConversationClient>,
  isExperimentalEnabled: (request: KibanaRequest) => Promise<boolean>
) =>
  createServerStepDefinition({
    ...getConversationMetadataStepCommonDefinition,
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
        const input = context.input as GetConversationMetadataStepInput;

        const conversation = await client.get(input.conversation_id);

        return {
          output: {
            metadata: (conversation.metadata ?? {}) as Record<string, unknown>,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
