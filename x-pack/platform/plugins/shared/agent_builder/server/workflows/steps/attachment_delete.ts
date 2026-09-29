/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  deleteAttachmentStepCommonDefinition,
  type DeleteAttachmentStepInput,
} from '../../../common/workflows/steps/attachment_delete';
import type { AttachmentStepDeps } from '../attachment_registry';

export const deleteAttachmentStepDefinition = ({
  getAttachmentClient,
  isExperimentalEnabled,
}: AttachmentStepDeps) =>
  createServerStepDefinition({
    ...deleteAttachmentStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        if (!(await isExperimentalEnabled(request))) {
          return {
            error: new Error('Attachment steps require experimental features to be enabled'),
          };
        }
        const client = await getAttachmentClient(request);
        const input = context.input as DeleteAttachmentStepInput;

        await client.delete({
          conversationId: input.conversation_id,
          attachmentId: input.attachment_id,
          permanent: input.permanent,
        });

        return {
          output: {
            success: true,
            permanent: input.permanent ?? false,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
