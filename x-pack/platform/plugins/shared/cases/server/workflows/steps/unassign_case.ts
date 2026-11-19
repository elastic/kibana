/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  unassignCaseStepCommonDefinition,
  type UnassignCaseStepInput,
} from '../../../common/workflows/steps/unassign_case';
import type { CasesClient } from '../../client';
import { UPDATE_CASE_FAILED_MESSAGE } from './translations';
import { createCasesStepHandler } from './utils';
import { updateSingleCase } from './update_case_helpers';

const shouldUnassignAll = (assignees: UnassignCaseStepInput['assignees']) =>
  assignees == null || assignees.length === 0;

const resolveUnassignUpdate = async (client: CasesClient, input: UnassignCaseStepInput) => {
  if (shouldUnassignAll(input.assignees)) {
    return {
      assignees: [],
      version: input.version,
    };
  }

  const assigneesToRemove = input.assignees ?? [];
  const caseToUpdate = await client.cases.get({
    id: input.case_id,
    includeComments: false,
  });

  const assigneeIdsToRemove = new Set(assigneesToRemove.map(({ uid }) => uid));

  return {
    assignees: (caseToUpdate.assignees ?? []).filter(({ uid }) => !assigneeIdsToRemove.has(uid)),
    version: input.version ?? caseToUpdate.version,
  };
};

export const unassignCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...unassignCaseStepCommonDefinition,
    handler: createCasesStepHandler<UnassignCaseStepInput>(
      getCasesClient,
      async (client, input) => {
        const { assignees, version } = await resolveUnassignUpdate(client, input);

        return updateSingleCase(client, {
          caseId: input.case_id,
          version,
          updates: { assignees },
        });
      },
      {
        onError: (_error, input) => new Error(UPDATE_CASE_FAILED_MESSAGE(input.case_id)),
      }
    ),
  });
