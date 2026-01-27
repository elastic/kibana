/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  createCaseStepCommonDefinition,
  type CreateCaseStepInput,
} from '../../common/workflows/steps/create_case';
import type { CasesServerStartDependencies } from '../types';
import type { CasesClient } from '../client';

import { createCasesStepHandler } from './utils';

export const createCaseStepDefinition = (
  coreSetup: CoreSetup<CasesServerStartDependencies>,
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...createCaseStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, (client, input: CreateCaseStepInput) =>
      client.cases.create(input)
    ),
  });
