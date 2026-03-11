/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  setStatusStepCommonDefinition,
  type SetStatusStepInput,
} from '../../../common/workflows/steps/set_status';
import type { CasesClient } from '../../client';
import { UPDATE_CASE_FAILED_MESSAGE } from './translations';
import { createUpdateSingleCaseStepHandler } from './update_case_helpers';

export const setStatusStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setStatusStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<SetStatusStepInput>(
      getCasesClient,
      (input) => ({ status: input.status }),
      UPDATE_CASE_FAILED_MESSAGE
    ),
  });
