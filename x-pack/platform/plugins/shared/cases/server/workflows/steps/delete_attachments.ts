/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { deleteAttachmentsStepCommonDefinition } from '../../../common/workflows/steps/delete_attachments';
import type { CasesClient } from '../../client';
import { DELETE_ATTACHMENTS_FAILED_MESSAGE } from './translations';
import { getCasesClientFromStepsContext, getErrorMessage } from './utils';

export const deleteAttachmentsStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...deleteAttachmentsStepCommonDefinition,
    handler: async (context) => {
      const { case_id, ids, include_related: includeRelated } = context.input;

      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        context.abortSignal.throwIfAborted();
        await casesClient.attachments.bulkDelete({
          caseId: case_id,
          savedObjectIds: ids,
          includeRelated,
        });

        return {
          output: {
            case_id,
            ids: [...new Set(ids)],
          },
        };
      } catch (error) {
        return {
          error: new Error(DELETE_ATTACHMENTS_FAILED_MESSAGE(case_id, ids, getErrorMessage(error))),
        };
      }
    },
  });
