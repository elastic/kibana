/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  setDescriptionStepCommonDefinition,
  type SetDescriptionStepInput,
} from '../../../common/workflows/steps/set_description';
import type { CasesClient } from '../../client';
import { UPDATE_CASE_FAILED_MESSAGE } from './translations';
import { createUpdateSingleCaseStepHandler } from './update_case_helpers';

export const setDescriptionStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setDescriptionStepCommonDefinition,
    handler: createUpdateSingleCaseStepHandler<SetDescriptionStepInput>(
      getCasesClient,
      (input) => ({ description: input.description }),
      UPDATE_CASE_FAILED_MESSAGE
    ),
  });
