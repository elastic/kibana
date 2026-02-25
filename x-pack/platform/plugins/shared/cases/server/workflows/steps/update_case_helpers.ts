/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../../common/bundled-types.gen';
import type { UpdateCaseStepInput } from '../../../common/workflows/steps/update_case';
import { CasePatchRequestRt } from '../../../common/types/api';
import type { CasesClient } from '../../client';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { normalizeCaseStepUpdatesForBulkPatch } from './utils';

type WorkflowUpdatePayload = UpdateCaseStepInput['updates'];

interface UpdateSingleCaseParams {
  caseId: string;
  version?: string;
  updates: WorkflowUpdatePayload;
  onNotFoundError: Error;
}

export const updateSingleCase = async (
  client: CasesClient,
  { caseId, version, updates, onNotFoundError }: UpdateSingleCaseParams
) => {
  const resolvedVersion =
    version ??
    (
      await client.cases.get({
        id: caseId,
        includeComments: false,
      })
    ).version;

  const normalizedCasePatch = decodeWithExcessOrThrow(CasePatchRequestRt)({
    id: caseId,
    version: resolvedVersion,
    ...normalizeCaseStepUpdatesForBulkPatch(updates),
  });

  const updatedCases = await client.cases.bulkUpdate({
    cases: [normalizedCasePatch],
  });

  const updatedCase = updatedCases.find((updated) => updated.id === caseId);
  if (!updatedCase) {
    throw onNotFoundError;
  }

  return CaseResponsePropertiesSchema.parse(updatedCase);
};
