/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getCasesByAlertIdStepCommonDefinition } from '../../../common/workflows/steps/get_cases_by_alert_id';
import type { CasesClient } from '../../client';
import { getCasesClientFromStepsContext } from './utils';

export const getCasesByAlertIdStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...getCasesByAlertIdStepCommonDefinition,
    handler: async (context) => {
      const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
      const relatedCases = await casesClient.cases.getCasesByAlertID({
        alertID: context.input.alert_id,
        options: {
          owner: context.input.owner,
        },
      });

      const output = getCasesByAlertIdStepCommonDefinition.outputSchema.parse({
        cases: relatedCases,
      });

      return { output };
    },
  });
