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
import { CasePatchRequestRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import type { CasesClient } from '../../client';
import {
  createCaseIdOnError,
  createCasesStepHandler,
  normalizeCaseStepUpdatesForBulkPatch,
} from './utils';
import { UPDATE_CASE_FAILED_MESSAGE } from './translations';
import { resolveCaseVersion } from './update_case_helpers';

export const updateCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...updateCaseStepCommonDefinition,
    handler: createCasesStepHandler(
      getCasesClient,
      async (client, input: UpdateCaseStepInput) => {
        const version = await resolveCaseVersion(client, input.case_id, input.version);

        const normalizedCasePatch = decodeWithExcessOrThrow(CasePatchRequestRt)({
          id: input.case_id,
          version,
          ...normalizeCaseStepUpdatesForBulkPatch(input.updates),
        });

        const updatedCases = await client.cases.bulkUpdate({
          cases: [normalizedCasePatch],
        });

        const updatedCase = updatedCases.find((updated) => updated.id === input.case_id);
        if (!updatedCase) {
          throw new Error(UPDATE_CASE_FAILED_MESSAGE(input.case_id));
        }

        return updateCaseStepCommonDefinition.outputSchema.shape.case.parse(updatedCase);
      },
      {
        onError: createCaseIdOnError<UpdateCaseStepInput>(UPDATE_CASE_FAILED_MESSAGE),
      }
    ),
  });
