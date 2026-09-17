/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getAllAttachmentsStepCommonDefinition } from '../../../common/workflows/steps/get_all_attachments';
import { toLegacyAttachmentResponse } from '../../common/attachments';
import type { CasesClient } from '../../client';
import { getCasesClientFromStepsContext, safeParseCaseForWorkflowOutput } from './utils';

export const getAllAttachmentsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...getAllAttachmentsStepCommonDefinition,
    handler: async (context) => {
      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        const attachments = await casesClient.attachments.getAll({
          caseID: context.input.case_id,
        });

        // The client is unified-only; the output schema mirrors the public (legacy) wire
        // shape, so unified comments must be converted back or they'd silently mismatch
        // the schema and fall through `safeParseCaseForWorkflowOutput`'s raw fallback.
        const output = safeParseCaseForWorkflowOutput(
          getAllAttachmentsStepCommonDefinition.outputSchema,
          { attachments: attachments.map(toLegacyAttachmentResponse) }
        );

        return { output };
      } catch (error) {
        return { error };
      }
    },
  });
