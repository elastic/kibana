/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  CaseIdsSchema,
  deleteCasesStepCommonDefinition,
} from '../../../common/workflows/steps/delete_cases';
import type { CasesClient } from '../../client';
import { DELETE_CASES_FAILED_MESSAGE } from './translations';
import { ensureArrayShape, getCasesClientFromStepsContext, getErrorMessage } from './utils';

export const deleteCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...deleteCasesStepCommonDefinition,
    handler: async (context) => {
      const input = deleteCasesStepCommonDefinition.inputSchema.parse(context.input);
      const inputCaseIds = ensureArrayShape(input.case_ids, CaseIdsSchema);
      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        await casesClient.cases.delete(inputCaseIds);

        const output = deleteCasesStepCommonDefinition.outputSchema.parse({
          case_ids: inputCaseIds,
        });

        return { output };
      } catch (error) {
        return {
          error: new Error(DELETE_CASES_FAILED_MESSAGE(inputCaseIds, getErrorMessage(error))),
        };
      }
    },
  });
