/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { conversationUpdateStepCommonDefinition } from '../../common/step_types/conversation_update';
import type { ServiceManager } from '../services';
import { toConversationStepError } from './conversation_step_error';
import { getConversationClient } from './get_conversation_client';

export const getConversationUpdateStepDefinition = (serviceManager: ServiceManager) =>
  createServerStepDefinition({
    ...conversationUpdateStepCommonDefinition,
    handler: async (context) => {
      const {
        conversation_id: conversationId,
        title,
        read,
        pinned,
        metadata,
        template_id: templateId,
        template_version: templateVersion,
      } = context.input;

      try {
        const { client } = await getConversationClient(serviceManager, context.contextManager);

        const conversation = await client.update(
          {
            id: conversationId,
            ...(title !== undefined ? { title } : {}),
            ...(read !== undefined ? { read } : {}),
            ...(pinned !== undefined ? { pinned } : {}),
            ...(metadata !== undefined ? { metadata } : {}),
            ...(templateId !== undefined ? { template_id: templateId } : {}),
            ...(templateVersion !== undefined ? { template_version: templateVersion } : {}),
          },
          // Concurrent workflow runs writing to the same conversation are expected;
          // let the client reconcile them rather than failing the step.
          { access: 'owner', retryOnConflict: true }
        );

        return { output: conversation };
      } catch (error) {
        throw toConversationStepError(error);
      }
    },
  });
