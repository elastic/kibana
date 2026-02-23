/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  updateCasesStepCommonDefinition,
  type UpdateCasesStepInput,
} from '../../../common/workflows/steps/update_cases';
import { CasePatchRequestRt } from '../../../common/types/api';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import type { CasesClient } from '../../client';
import { normalizeCaseStepUpdatesForBulkPatch } from './utils';
import { UPDATE_CASES_FAILED_MESSAGE } from './translations';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return String(error);
};

const resolveFailedCaseId = (error: unknown, caseIds: string[]): string => {
  if (error instanceof Error) {
    const matchingCaseId = caseIds.find((caseId) => error.message.includes(caseId));
    if (matchingCaseId) {
      return matchingCaseId;
    }
  }

  return caseIds[0];
};

export const updateCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...updateCasesStepCommonDefinition,
    handler: async (context) => {
      const input = context.input as UpdateCasesStepInput;
      const caseIds = input.cases.map(({ case_id: caseId }) => caseId);

      try {
        const request = context.contextManager.getFakeRequest();
        const casesClient = await getCasesClient(request);

        const normalizedCasePatches = await Promise.all(
          input.cases.map(async (caseInput) => {
            try {
              const version =
                caseInput.version ??
                (
                  await casesClient.cases.get({
                    id: caseInput.case_id,
                    includeComments: false,
                  })
                ).version;

              return decodeWithExcessOrThrow(CasePatchRequestRt)({
                id: caseInput.case_id,
                version,
                ...normalizeCaseStepUpdatesForBulkPatch(caseInput.updates),
              });
            } catch (error) {
              throw new Error(
                UPDATE_CASES_FAILED_MESSAGE(caseInput.case_id, getErrorMessage(error))
              );
            }
          })
        );

        const updatedCases = await casesClient.cases.bulkUpdate({
          cases: normalizedCasePatches,
        });

        const updatedCaseIds = new Set(updatedCases.map(({ id }) => id));
        const missingCaseId = caseIds.find((caseId) => !updatedCaseIds.has(caseId));
        if (missingCaseId) {
          throw new Error(
            UPDATE_CASES_FAILED_MESSAGE(
              missingCaseId,
              'The case was not returned in the bulk update response'
            )
          );
        }

        if (context.config['push-case']) {
          for (const updatedCase of updatedCases) {
            try {
              await casesClient.cases.push({
                caseId: updatedCase.id,
                connectorId: updatedCase.connector.id,
                pushType: 'automatic',
              });
            } catch (error) {
              throw new Error(UPDATE_CASES_FAILED_MESSAGE(updatedCase.id, getErrorMessage(error)));
            }
          }
        }

        const output = updateCasesStepCommonDefinition.outputSchema.parse({ cases: updatedCases });
        return { output };
      } catch (error) {
        if (error instanceof Error && error.message.includes('could not be updated')) {
          return { error };
        }

        const failedCaseId = resolveFailedCaseId(error, caseIds);
        return {
          error: new Error(UPDATE_CASES_FAILED_MESSAGE(failedCaseId, getErrorMessage(error))),
        };
      }
    },
  });
