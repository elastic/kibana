/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  findCasesStepCommonDefinition,
  type FindCasesStepInput,
  type FindCasesStepOutput,
} from '../../../common/workflows/steps/find_cases';
import type {
  CasesFindRequestWithCustomFields,
  CasesFindResponse,
} from '../../../common/types/api';
import type { CasesClient } from '../../client';

export const findCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...findCasesStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const casesClient = await getCasesClient(request);
        const input = context.input as FindCasesStepInput;

        const findRequest: CasesFindRequestWithCustomFields = input;
        const response: CasesFindResponse = await casesClient.cases.find(findRequest);
        const output: FindCasesStepOutput =
          findCasesStepCommonDefinition.outputSchema.parse(response);

        return { output };
      } catch (error) {
        return { error };
      }
    },
  });
