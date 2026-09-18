/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  addConversationEventStepCommonDefinition,
  type AddConversationEventStepInput,
} from '../../../common/workflows/steps/add_conversation_event';
import type { ConversationStepDeps } from '../registry';

export const addConversationEventStepDefinition = ({
  getConversationClient,
  isExperimentalEnabled,
}: ConversationStepDeps) =>
  createServerStepDefinition({
    ...addConversationEventStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        if (!(await isExperimentalEnabled(request))) {
          return {
            error: new Error(
              'Conversation event steps require experimental features to be enabled'
            ),
          };
        }
        const client = await getConversationClient(request);
        const input = context.input as AddConversationEventStepInput;

        const [event] = await client.addCustomEvents({
          id: input.conversation_id,
          events: [{ type: input.type, data: input.data ?? {} }],
        });

        return {
          output: {
            conversation_id: input.conversation_id,
            event_id: event.id,
            type: event.type,
            created_at: event.created_at,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
