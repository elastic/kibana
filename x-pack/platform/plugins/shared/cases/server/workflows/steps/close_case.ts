/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  closeCaseStepCommonDefinition,
  type CloseCaseStepInput,
} from '../../../common/workflows/steps/close_case';
import type { CasesClient } from '../../client';
import { createUpdateSingleCaseStepHandler } from './update_case_helpers';

export const closeCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...closeCaseStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<CloseCaseStepInput>(getCasesClient, () => ({
      status: 'closed',
    })),
  });
