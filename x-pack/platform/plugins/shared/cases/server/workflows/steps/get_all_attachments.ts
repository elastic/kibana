/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getAllAttachmentsStepCommonDefinition } from '../../../common/workflows/steps/get_all_attachments';
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

        const output = safeParseCaseForWorkflowOutput(
          getAllAttachmentsStepCommonDefinition.outputSchema,
          { attachments }
        );

        return { output };
      } catch (error) {
        return { error };
      }
    },
  });
