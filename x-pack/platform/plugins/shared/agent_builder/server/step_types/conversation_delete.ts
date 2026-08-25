/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { conversationDeleteStepCommonDefinition } from '../../common/step_types/conversation_delete';
import type { ServiceManager } from '../services';
import { toConversationStepError } from './conversation_step_error';
import { getConversationClient } from './get_conversation_client';

export const getConversationDeleteStepDefinition = (serviceManager: ServiceManager) =>
  createServerStepDefinition({
    ...conversationDeleteStepCommonDefinition,
    handler: async (context) => {
      try {
        const { client } = await getConversationClient(serviceManager, context.contextManager);
        const success = await client.delete(context.input.conversation_id);

        return { output: { success } };
      } catch (error) {
        throw toConversationStepError(error);
      }
    },
  });
