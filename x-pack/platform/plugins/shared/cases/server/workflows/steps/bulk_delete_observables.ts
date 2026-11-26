/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { bulkDeleteObservablesStepCommonDefinition } from '../../../common/workflows/steps/bulk_delete_observables';
import type { CasesClient } from '../../client';
import { BULK_DELETE_OBSERVABLES_FAILED_MESSAGE } from './translations';
import { getCasesClientFromStepsContext, getErrorMessage } from './utils';

export const bulkDeleteObservablesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...bulkDeleteObservablesStepCommonDefinition,
    handler: async (context) => {
      const { case_id, observable_ids } = context.input;

      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        await casesClient.cases.bulkDeleteObservables({
          caseId: case_id,
          observableIds: observable_ids,
        });

        return {
          output: {
            case_id,
            observable_ids,
          },
        };
      } catch (error) {
        return {
          error: new Error(
            BULK_DELETE_OBSERVABLES_FAILED_MESSAGE(case_id, observable_ids, getErrorMessage(error))
          ),
        };
      }
    },
  });
