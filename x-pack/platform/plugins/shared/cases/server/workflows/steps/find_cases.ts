/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { findCasesStepCommonDefinition } from '../../../common/workflows/steps/find_cases';
import type { CasesFindRequestWithCustomFields } from '../../../common/types/api';
import type { CasesClient } from '../../client';
import { getCasesClientFromStepsContext } from './utils';

export const findCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...findCasesStepCommonDefinition,
    handler: async (context) => {
      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        const input = findCasesStepCommonDefinition.inputSchema.parse(context.input);

        const findRequest: CasesFindRequestWithCustomFields = {
          ...input,
          status: input.status as CasesFindRequestWithCustomFields['status'],
          severity: input.severity as CasesFindRequestWithCustomFields['severity'],
        };
        const response = await casesClient.cases.find(findRequest);
        const output = findCasesStepCommonDefinition.outputSchema.parse(response);

        return { output };
      } catch (error) {
        return { error };
      }
    },
  });
