/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { CaseResponseProperties as CaseResponsePropertiesSchema } from '../../../common/bundled-types.gen';
import type { UpdateCaseStepInput } from '../../../common/workflows/steps/update_case';
import { CasePatchRequestRt } from '../../../common/types/api';
import type { CasesClient } from '../../client';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';
import { UPDATE_CASE_FAILED_MESSAGE } from './translations';
import {
  createCasesStepHandler,
  normalizeCaseStepUpdatesForBulkPatch,
  safeParseCaseForWorkflowOutput,
} from './utils';

type WorkflowUpdatePayload = UpdateCaseStepInput['updates'];

interface UpdateSingleCaseParams {
  caseId: string;
  version?: string;
  updates: WorkflowUpdatePayload;
}

interface PrepareCasePatchParams {
  caseId: string;
  version?: string;
  updates: WorkflowUpdatePayload;
}

interface CaseIdVersionInput {
  case_id: string;
  version?: string;
}

export const resolveCaseVersion = async (client: CasesClient, caseId: string, version?: string) =>
  version ??
  (
    await client.cases.get({
      id: caseId,
      includeComments: false,
    })
  ).version;

export const prepareCasePatch = async (
  client: CasesClient,
  { caseId, version, updates }: PrepareCasePatchParams
) => {
  const resolvedVersion = await resolveCaseVersion(client, caseId, version);

  return decodeWithExcessOrThrow(CasePatchRequestRt)({
    id: caseId,
    version: resolvedVersion,
    ...normalizeCaseStepUpdatesForBulkPatch(updates),
  });
};

export const updateSingleCase = async (
  client: CasesClient,
  { caseId, version, updates }: UpdateSingleCaseParams
) => {
  const normalizedCasePatch = await prepareCasePatch(client, { caseId, version, updates });

  const updatedCases = await client.cases.bulkUpdate({
    cases: [normalizedCasePatch],
  });

  const updatedCase = updatedCases.find((updated) => updated.id === caseId);
  if (!updatedCase) {
    throw new Error(UPDATE_CASE_FAILED_MESSAGE(caseId));
  }

  return safeParseCaseForWorkflowOutput(CaseResponsePropertiesSchema, updatedCase);
};

export const updateSingleCaseFromInput = <TInput extends CaseIdVersionInput>(
  client: CasesClient,
  input: TInput,
  updates: WorkflowUpdatePayload
) =>
  updateSingleCase(client, {
    caseId: input.case_id,
    version: input.version,
    updates,
  });

export const createUpdateSingleCaseStepHandler = <TInput extends CaseIdVersionInput>(
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  getUpdates: (input: TInput) => WorkflowUpdatePayload
) =>
  createCasesStepHandler(getCasesClient, async (client, input: TInput) =>
    updateSingleCase(client, {
      caseId: input.case_id,
      version: input.version,
      updates: getUpdates(input),
    })
  );
