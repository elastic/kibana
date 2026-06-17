/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { pushCasesStepCommonDefinition } from '../../../common/workflows/steps/push_cases';
import type { CasesClient } from '../../client';
import { getCasesClientFromStepsContext, safeParseCaseForWorkflowOutput } from './utils';

const pushSingleCase = async (client: CasesClient, caseId: string) => {
  const theCase = await client.cases.get({ id: caseId, includeComments: false });
  return client.cases.push({ caseId, connectorId: theCase.connector.id, pushType: 'automatic' });
};

export const pushCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...pushCasesStepCommonDefinition,
    handler: async (context) => {
      const { case_ids: caseIds } = context.input;

      try {
        const client = await getCasesClientFromStepsContext(context, getCasesClient);
        const pushedCases = await Promise.all(caseIds.map((id) => pushSingleCase(client, id)));

        const output = safeParseCaseForWorkflowOutput(pushCasesStepCommonDefinition.outputSchema, {
          cases: pushedCases,
        });

        return { output };
      } catch (error) {
        return { error };
      }
    },
  });
