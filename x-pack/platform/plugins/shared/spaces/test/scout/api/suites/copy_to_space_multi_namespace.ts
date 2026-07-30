/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

import type { CopyToSpaceMultiNamespaceTest } from './copy_to_space';
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

/**
 * The (overwrite, createNewCopies) combos exercised by the multi-namespace copy cases.
 * `[true, true]` is intentionally absent (the API rejects that combination at the schema
 * level, covered elsewhere).
 */
export const MULTI_NAMESPACE_COMBOS = [
  { overwrite: false, createNewCopies: false },
  { overwrite: false, createNewCopies: true },
  { overwrite: true, createNewCopies: false },
] as const;

interface CopyToSpaceMultiNamespaceTestDefinition {
  user: RoleName;
  spaceId?: string;
  overwrite: boolean;
  createNewCopies: boolean;
  cases: CopyToSpaceMultiNamespaceTest[];
}

/**
 * The multi-namespace combo groups. Lives in its own file so it keeps a single
 * `apiTest.describe` call site (`@kbn/eslint/scout_max_one_describe`) alongside the
 * single-namespace factory in `copy_to_space.ts`. The archive is loaded ONCE per combo
 * group (`beforeAll`) — no multi-namespace case depends on a prior case's mutation; each
 * targets a distinct object id.
 */
export const copyToSpaceMultiNamespaceTest = (
  description: string,
  {
    user,
    spaceId = 'default',
    overwrite,
    createNewCopies,
    cases,
  }: CopyToSpaceMultiNamespaceTestDefinition
) => {
  if (spaceId !== 'default' && spaceId !== 'space_1') {
    throw new Error(
      `Unsupported origin space '${spaceId}': the copy_to_space fixtures only cover 'default' and 'space_1'`
    );
  }

  const copyPath = `${getUrlPrefix(spaceId)}/api/spaces/_copy_saved_objects`;

  apiTest.describe(
    `${description} - multi-namespace types with overwrite=${overwrite} and createNewCopies=${createNewCopies}`,
    () => {
      apiTest.beforeAll(async ({ kbnClient }) => {
        await createCopySpaces(kbnClient);
        await createCopySavedObjects(kbnClient);
      });

      apiTest.afterAll(async ({ kbnClient }) => {
        await deleteCopySavedObjects(kbnClient);
        await deleteCopySpaces(kbnClient);
      });

      for (const { testTitle, objects, statusCode, response } of cases) {
        apiTest(
          `should return ${statusCode} when ${testTitle}`,
          async ({ apiClient, esClient, samlAuth }) => {
            const apiResponse = await apiClient.post(copyPath, {
              headers: await roleHeaders(samlAuth, user),
              body: {
                objects,
                spaces: ['space_2'],
                includeReferences: false,
                createNewCopies,
                overwrite,
              },
            });

            expect(apiResponse).toHaveStatusCode(statusCode);
            await response(apiResponse, { esClient });
          }
        );
      }
    }
  );
};
