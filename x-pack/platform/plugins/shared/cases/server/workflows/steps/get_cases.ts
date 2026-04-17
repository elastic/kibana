/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getCasesStepCommonDefinition } from '../../../common/workflows/steps/get_cases';
import type { CasesClient } from '../../client';
import { getCasesClientFromStepsContext } from './utils';

export const getCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...getCasesStepCommonDefinition,
    handler: async (context) => {
      const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
      const result = await casesClient.cases.bulkGet({ ids: context.input.case_ids });

      const output = getCasesStepCommonDefinition.outputSchema.parse(result);

      return { output };
    },
  });
