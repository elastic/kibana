/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  createCaseStepCommonDefinition,
  type CreateCaseStepOutput,
} from '../../../common/workflows/steps/create_case';
import type { CasesClient } from '../../client';

import { createCasesStepHandler } from './utils';
import {
  getInitialCaseValue,
  type GetInitialCaseValueArgs,
} from '../../../common/utils/get_initial_case_value';

export const createCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...createCaseStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input) => {
      const enrichedInput = getInitialCaseValue(input as unknown as GetInitialCaseValueArgs);
      const createdCase = await client.cases.create(enrichedInput);
      return createdCase as unknown as CreateCaseStepOutput['case'];
    }),
  });
