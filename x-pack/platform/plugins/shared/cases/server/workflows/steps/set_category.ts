/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  setCategoryStepCommonDefinition,
  type SetCategoryStepInput,
} from '../../../common/workflows/steps/add_category';
import type { CasesClient } from '../../client';
import { UPDATE_CASE_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler } from './utils';
import { updateSingleCase } from './update_case_helpers';

export const setCategoryStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...setCategoryStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: SetCategoryStepInput) =>
        updateSingleCase(client, {
          caseId: input.case_id,
          version: input.version,
          updates: { category: input.category },
          onNotFoundError: new Error(UPDATE_CASE_FAILED_MESSAGE(input.case_id)),
        }),
      {
        onError: (_error, input: SetCategoryStepInput) =>
          new Error(UPDATE_CASE_FAILED_MESSAGE(input.case_id)),
      }
    ),
  });
