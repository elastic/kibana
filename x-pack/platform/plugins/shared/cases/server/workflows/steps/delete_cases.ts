/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { deleteCasesStepCommonDefinition } from '../../../common/workflows/steps/delete_cases';
import type { CasesClient } from '../../client';
import { DELETE_CASES_FAILED_MESSAGE } from './translations';
import {
  getCasesClientFromStepsContext,
  getErrorMessage,
  safeParseCaseForWorkflowOutput,
} from './utils';

export const deleteCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...deleteCasesStepCommonDefinition,
    handler: async (context) => {
      const { case_ids } = context.input;

      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        await casesClient.cases.delete(case_ids);

        const output = safeParseCaseForWorkflowOutput(
          deleteCasesStepCommonDefinition.outputSchema,
          { case_ids }
        );

        return { output };
      } catch (error) {
        return {
          error: new Error(DELETE_CASES_FAILED_MESSAGE(case_ids, getErrorMessage(error))),
        };
      }
    },
  });
