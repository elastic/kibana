/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  readAttachmentStepCommonDefinition,
  type ReadAttachmentStepInput,
} from '../../../common/workflows/steps/attachment_read';
import type { AttachmentStepDeps } from '../attachment_registry';

export const readAttachmentStepDefinition = ({
  getAttachmentClient,
  isExperimentalEnabled,
}: AttachmentStepDeps) =>
  createServerStepDefinition({
    ...readAttachmentStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        if (!(await isExperimentalEnabled(request))) {
          return {
            error: new Error('Attachment steps require experimental features to be enabled'),
          };
        }
        const client = await getAttachmentClient(request);
        const input = context.input as ReadAttachmentStepInput;

        const attachment = await client.get({
          conversationId: input.conversation_id,
          attachmentId: input.attachment_id,
        });

        const targetVersion = input.version ?? attachment.current_version;
        const version = attachment.versions.find((v) => v.version === targetVersion);
        if (!version) {
          throw new Error(`Attachment '${input.attachment_id}' has no version ${targetVersion}`);
        }

        return {
          output: {
            data: version.data,
            version: version.version,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
