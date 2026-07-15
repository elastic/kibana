/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

import type { ResolveCopyToSpaceMultiNamespaceTest } from './resolve_copy_to_space_conflicts';
import { roleHeaders } from '../common/api_helpers';
import {
  createCopySavedObjects,
  createCopySpaces,
  deleteCopySavedObjects,
  deleteCopySpaces,
} from '../common/copy_to_space_data';
import type { RoleName } from '../common/roles';
import { getUrlPrefix } from '../common/spaces';
import { apiTest } from '../fixtures';

interface ResolveMultiNamespaceTestDefinition {
  user: RoleName;
  spaceId?: string;
  cases: ResolveCopyToSpaceMultiNamespaceTest[];
}

/**
 * The multi-namespace "overwrite" retry group. Lives in its own file so it keeps a single
 * `apiTest.describe` call site (`@kbn/eslint/scout_max_one_describe`) alongside the
 * single-namespace factory in `resolve_copy_to_space_conflicts.ts`. The archive is loaded
 * ONCE for the group (`beforeAll`) — no multi-namespace case depends on a prior case's
 * mutation.
 */
export const resolveCopyToSpaceConflictsMultiNamespaceTest = (
  description: string,
  { user, spaceId = 'default', cases }: ResolveMultiNamespaceTestDefinition
) => {
  if (spaceId !== 'default' && spaceId !== 'space_1') {
    throw new Error(
      `Unsupported origin space '${spaceId}': the copy_to_space fixtures only cover 'default' and 'space_1'`
    );
  }

  const resolvePath = `${getUrlPrefix(spaceId)}/api/spaces/_resolve_copy_saved_objects_errors`;

  apiTest.describe(`${description} - multi-namespace types with "overwrite" retry`, () => {
    apiTest.beforeAll(async ({ kbnClient }) => {
      await createCopySpaces(kbnClient);
      await createCopySavedObjects(kbnClient);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteCopySavedObjects(kbnClient);
      await deleteCopySpaces(kbnClient);
    });

    for (const { testTitle, objects, retries, statusCode, response } of cases) {
      apiTest(
        `should return ${statusCode} when ${testTitle}`,
        async ({ apiClient, kbnClient, samlAuth }) => {
          const apiResponse = await apiClient.post(resolvePath, {
            headers: await roleHeaders(samlAuth, user),
            body: { objects, includeReferences: false, createNewCopies: false, retries },
          });
          expect(apiResponse).toHaveStatusCode(statusCode);
          await response(apiResponse, { kbnClient });
        }
      );
    }
  });
};
