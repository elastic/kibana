/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  addAttachmentStepCommonDefinition,
  type AddAttachmentStepInput,
} from '../../../common/workflows/steps/attachment_add';
import type { AttachmentStepDeps } from '../attachment_registry';

export const addAttachmentStepDefinition = ({
  getAttachmentClient,
  isExperimentalEnabled,
}: AttachmentStepDeps) =>
  createServerStepDefinition({
    ...addAttachmentStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        const request = context.contextManager.getFakeRequest();
        if (!(await isExperimentalEnabled(request))) {
          return {
            error: new Error('Attachment steps require experimental features to be enabled'),
          };
        }
        const client = await getAttachmentClient(request);
        const input = context.input as AddAttachmentStepInput;

        const attachment = await client.create({
          conversationId: input.conversation_id,
          id: input.id,
          type: input.type,
          data: input.data,
          origin: input.origin,
          description: input.description,
          hidden: input.hidden,
        });

        return {
          output: {
            attachment_id: attachment.id,
            type: attachment.type,
            current_version: attachment.current_version,
          },
        };
      } catch (error) {
        return { error };
      }
    },
  });
