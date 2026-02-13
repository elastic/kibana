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
  type UpdateCaseStepOutput,
} from '../../../common/workflows/steps/update_case';
import type { CasesClient } from '../../client';
import { createCasesStepHandler } from './utils';

export const updateCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...updateCaseStepCommonDefinition,
    handler: createCasesStepHandler(getCasesClient, async (client, input: UpdateCaseStepInput) => {
      const theCase = await client.cases.get({
        id: input.case_id,
        includeComments: false,
      });

      const updatedCases = await client.cases.bulkUpdate({
        cases: [{ id: input.case_id, version: theCase.version, ...input.updates }],
      });

      const updatedCase = updatedCases.find((updated) => updated.id === input.case_id);
      if (!updatedCase) {
        throw new Error(`Case [${input.case_id}] not found in update response`);
      }

      return updatedCase as UpdateCaseStepOutput['case'];
    }),
  });
