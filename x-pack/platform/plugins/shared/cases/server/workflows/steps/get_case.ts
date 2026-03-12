/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  getCaseStepCommonDefinition,
  type GetCaseStepInput,
  type GetCaseStepOutput,
} from '../../../common/workflows/steps/get_case';
import type { CasesClient } from '../../client';
import { createCasesStepHandler } from './utils';

export const getCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...getCaseStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: GetCaseStepInput) => {
      const theCase = await client.cases.get({
        id: input.case_id,
        includeComments: input.include_comments,
      });

      return theCase as GetCaseStepOutput['case'];
    }),
  });
