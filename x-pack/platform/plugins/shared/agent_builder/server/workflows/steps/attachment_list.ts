/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  listAttachmentsStepCommonDefinition,
  type ListAttachmentsStepInput,
} from '../../../common/workflows/steps/attachment_list';
import type { AttachmentStepDeps } from '../attachment_registry';

export const listAttachmentsStepDefinition = ({
  getAttachmentClient,
  isExperimentalEnabled,
}: AttachmentStepDeps) =>
  createServerStepDefinition({
    ...listAttachmentsStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        if (!(await isExperimentalEnabled(request))) {
          return {
            error: new Error('Attachment steps require experimental features to be enabled'),
          };
        }
        const client = await getAttachmentClient(request);
        const input = context.input as ListAttachmentsStepInput;

        const { results, total_token_estimate: totalTokenEstimate } = await client.list({
          conversationId: input.conversation_id,
          includeDeleted: input.include_deleted,
        });

        return {
          output: {
            attachments: results.map((attachment) => ({
              id: attachment.id,
              type: attachment.type,
              current_version: attachment.current_version,
              ...(attachment.description !== undefined
                ? { description: attachment.description }
                : {}),
              active: attachment.active ?? true,
            })),
            total_token_estimate: totalTokenEstimate,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
