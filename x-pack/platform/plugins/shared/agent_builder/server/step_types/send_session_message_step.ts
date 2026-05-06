/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ServiceManager } from '../services';
import { sendSessionMessageStepCommonDefinition } from '../../common/step_types/send_session_message_step';

/**
 * Server step definition for the "ai.send_session_message" step.
 * Injects a text message into a standing session trigger queue.
 */
export const getSendSessionMessageStepDefinition = (serviceManager: ServiceManager) => {
  return createServerStepDefinition({
    ...sendSessionMessageStepCommonDefinition,
    handler: async (context) => {
      try {
        const { session_id: sessionId, message } = context.input;
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new Error('No request available in workflow context');
        }

        const sessionsService = serviceManager.internalStart?.sessions;
        if (!sessionsService) {
          throw new Error('Sessions service is not available');
        }

        const client = sessionsService.getScopedClient({ request });
        const messageId = uuidv4();
        const result = await client.enqueueTrigger(sessionId, {
          type: 'session_message',
          subscription_id: undefined,
          event: {
            from_session_id: 'workflow',
            from_agent_id: 'workflow',
            message,
            message_id: messageId,
          },
        });

        return {
          output: {
            status: result.status,
            message_id: messageId,
          },
        };
      } catch (error) {
        context.logger.error(
          'ai.send_session_message step failed',
          error instanceof Error ? error : new Error(String(error))
        );
        return { error: error instanceof Error ? error : new Error(String(error)) };
      }
    },
  });
};
