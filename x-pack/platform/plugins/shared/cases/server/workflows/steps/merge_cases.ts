/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type {
  MergeBlockedConflict,
  MergeBlockedErrorAttributes,
} from '../../../common/constants/error_codes';
import type { MergeCasesRequest, MergeCasesResponse } from '../../../common/types/api';
import type {
  MergeCasesStepInput,
  MergeCasesStepOutput,
} from '../../../common/workflows/steps/merge_cases';
import { mergeCasesStepCommonDefinition } from '../../../common/workflows/steps/merge_cases';
import type { CasesClient } from '../../client';
import { getMergeBlockedAttributes } from '../../client/cases/merge/errors';
import {
  MERGE_CASES_BLOCKED_MESSAGE,
  MERGE_CASES_CONFLICT_DIFFERENT_VALUES,
  MERGE_CASES_CONFLICT_INVALID_VALUE,
  MERGE_CASES_CONFLICT_REQUIRED,
  MERGE_CASES_FAILED_MESSAGE,
  MERGE_CASES_LIMIT_EXCEEDED,
} from './translations';
import { getCasesClientFromStepsContext, getErrorMessage } from './utils';

/** The request field a conflict is settled by, such as `severity` or `extendedFields.risk_as_keyword`. */
const getConflictFieldPath = ({ field, key, label }: MergeBlockedConflict): string => {
  const path = key != null ? `${field}.${key}` : field;
  return label != null && label !== key ? `${path} (${label})` : path;
};

/** One line per conflict and per exceeded limit, for step errors and agent tool results. */
export const formatMergeBlockedProblems = ({
  conflicts,
  limits,
}: Pick<MergeBlockedErrorAttributes, 'conflicts' | 'limits'>): string[] => [
  ...conflicts.map((conflict) => {
    const field = getConflictFieldPath(conflict);
    switch (conflict.reason) {
      case 'invalidValue':
        return MERGE_CASES_CONFLICT_INVALID_VALUE(field, conflict.message);
      case 'required':
        return MERGE_CASES_CONFLICT_REQUIRED(field);
      default:
        return MERGE_CASES_CONFLICT_DIFFERENT_VALUES(field);
    }
  }),
  ...limits.map(({ kind, total, max, overBy }) =>
    MERGE_CASES_LIMIT_EXCEEDED(kind, total, max, overBy)
  ),
];

/** Maps the snake_case step input to the merge request. */
export const toMergeCasesRequest = ({
  case_ids: caseIds,
  destination_case_id: destinationCaseId,
  fields,
  attachments,
  close_sources: closeSources,
  note,
}: MergeCasesStepInput): MergeCasesRequest => ({
  caseIds,
  closeSources,
  ...(destinationCaseId != null ? { destinationCaseId } : {}),
  ...(fields != null ? { fields } : {}),
  ...(attachments != null ? { attachments } : {}),
  ...(note != null ? { note } : {}),
});

export const toMergeCasesStepOutput = (response: MergeCasesResponse): MergeCasesStepOutput => ({
  ...response,
  closedCaseIds: response.sources.filter(({ closed }) => closed).map(({ caseId }) => caseId),
});

export const mergeCasesStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...mergeCasesStepCommonDefinition,
    handler: async (context) => {
      const input = mergeCasesStepCommonDefinition.inputSchema.parse(context.input);

      try {
        const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
        const response = await casesClient.cases.merge(toMergeCasesRequest(input));

        // A source that was not fully merged is reported in the output, not as a step error, as
        // the API returns 200 for it.
        return { output: toMergeCasesStepOutput(response) };
      } catch (error) {
        const blocked = getMergeBlockedAttributes(error);
        if (blocked != null) {
          return {
            error: new Error(MERGE_CASES_BLOCKED_MESSAGE(formatMergeBlockedProblems(blocked))),
          };
        }

        return {
          error: new Error(MERGE_CASES_FAILED_MESSAGE(input.case_ids, getErrorMessage(error))),
        };
      }
    },
  });
