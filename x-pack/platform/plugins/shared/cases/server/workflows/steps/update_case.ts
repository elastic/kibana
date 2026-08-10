/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  updateCaseStepCommonDefinition,
  type UpdateCaseStepInput,
} from '../../../common/workflows/steps/update_case';
import type { CasesClient } from '../../client';
import { createUpdateSingleCaseStepHandler } from './update_case_helpers';

export const updateCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...updateCaseStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<UpdateCaseStepInput>(
      getCasesClient,
      (input) => input.updates
    ),
  });
