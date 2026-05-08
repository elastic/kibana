/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { updateCasesStepCommonDefinition } from '../../../common/workflows/steps/update_cases';
import type { CasesClient } from '../../client';
import {
  getCasesClientFromStepsContext,
  getErrorMessage,
  pushCase,
  safeParseCaseForWorkflowOutput,
} from './utils';
import { UPDATE_CASES_FAILED_MESSAGE } from './translations';
import { prepareCasePatch } from './update_case_helpers';

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
      const { cases } = context.input;
      const caseIds = cases.map(({ case_id: caseId }) => caseId);

      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);

        const normalizedCasePatches = await Promise.all(
          cases.map(async (caseInput) => {
            try {
              return await prepareCasePatch(casesClient, {
                caseId: caseInput.case_id,
                version: caseInput.version,
                updates: caseInput.updates,
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
              await pushCase(casesClient, updatedCase);
            } catch (error) {
              throw new Error(UPDATE_CASES_FAILED_MESSAGE(updatedCase.id, getErrorMessage(error)));
            }
          }
        }

        const output = safeParseCaseForWorkflowOutput(
          updateCasesStepCommonDefinition.outputSchema,
          { cases: updatedCases }
        );
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
