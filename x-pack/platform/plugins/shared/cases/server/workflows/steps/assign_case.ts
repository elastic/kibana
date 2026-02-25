/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  assignCaseStepCommonDefinition,
  type AssignCaseStepInput,
} from '../../../common/workflows/steps/assign_case';
import type { CasesClient } from '../../client';
import { UPDATE_CASE_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler } from './utils';
import { updateSingleCase } from './update_case_helpers';

export const assignCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...assignCaseStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: AssignCaseStepInput) =>
        updateSingleCase(client, {
          caseId: input.case_id,
          version: input.version,
          updates: { assignees: input.assignees },
          onNotFoundError: new Error(UPDATE_CASE_FAILED_MESSAGE(input.case_id)),
        }),
      {
        onError: (_error, input: AssignCaseStepInput) =>
          new Error(UPDATE_CASE_FAILED_MESSAGE(input.case_id)),
      }
    ),
  });
