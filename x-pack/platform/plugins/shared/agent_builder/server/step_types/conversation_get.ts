/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { conversationGetStepCommonDefinition } from '../../common/step_types/conversation_get';
import type { ServiceManager } from '../services';
import { toConversationStepError } from './conversation_step_error';
import { getConversationClient } from './get_conversation_client';

export const getConversationGetStepDefinition = (serviceManager: ServiceManager) =>
  createServerStepDefinition({
    ...conversationGetStepCommonDefinition,
    handler: async (context) => {
      try {
        const { client } = await getConversationClient(serviceManager, context.contextManager);
        const conversation = await client.get(context.input.conversation_id);

        return { output: conversation };
      } catch (error) {
        throw toConversationStepError(error);
      }
    },
  });
