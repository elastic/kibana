/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  updateAttachmentStepCommonDefinition,
  type UpdateAttachmentStepInput,
} from '../../../common/workflows/steps/attachment_update';
import type { AttachmentStepDeps } from '../attachment_registry';

export const updateAttachmentStepDefinition = ({
  getAttachmentClient,
  isExperimentalEnabled,
}: AttachmentStepDeps) =>
  createServerStepDefinition({
    ...updateAttachmentStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        if (!(await isExperimentalEnabled(request))) {
          return {
            error: new Error('Attachment steps require experimental features to be enabled'),
          };
        }
        const client = await getAttachmentClient(request);
        const input = context.input as UpdateAttachmentStepInput;

        const attachment = await client.update({
          conversationId: input.conversation_id,
          attachmentId: input.attachment_id,
          data: input.data,
          description: input.description,
        });

        return {
          output: {
            attachment_id: attachment.id,
            current_version: attachment.current_version,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
