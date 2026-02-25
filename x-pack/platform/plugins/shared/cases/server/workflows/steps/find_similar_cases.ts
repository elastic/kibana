/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  findSimilarCasesStepCommonDefinition,
  type FindSimilarCasesStepInput,
  type FindSimilarCasesStepOutput,
} from '../../../common/workflows/steps/find_similar_cases';
import type { CasesClient } from '../../client';
import { FIND_SIMILAR_CASES_FAILED_MESSAGE } from './translations';

export const findSimilarCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...findSimilarCasesStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as FindSimilarCasesStepInput;

      try {
        const request = context.contextManager.getFakeRequest();
        const casesClient = await getCasesClient(request);
        const similarCases = await casesClient.cases.similar(input.case_id, {
          page: input.page,
          perPage: input.perPage,
        });

        const output: FindSimilarCasesStepOutput =
          findSimilarCasesStepCommonDefinition.outputSchema.parse(similarCases);

        return { output };
      } catch (_error) {
        return {
          error: new Error(FIND_SIMILAR_CASES_FAILED_MESSAGE(input.case_id)),
        };
      }
    },
  });
