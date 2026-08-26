/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';

import type { SnapshotDetails } from '../../../../common/types';
import { SNAPSHOT_RESTORE_ADMIN_ROLE } from '../../common/fixtures/constants';
import { API_BASE_PATH, COMMON_HEADERS } from '../fixtures/constants';
import {
  createFsRepository,
  createSnapshot,
  deleteAllSnapshotsInRepo,
  deleteRepository,
  deleteSlmPolicy,
  executeSlmPolicy,
  putSlmPolicy,
  waitForSnapshotToFinish,
} from '../fixtures/es_helpers';

const REPO_NAME_1 = 'test_repo_1';
const REPO_NAME_2 = 'test_another_repo_2';
const REPO_PATH_1 = '/tmp/repo_1';
const REPO_PATH_2 = '/tmp/repo_2';
// SLM policies to test policyName filter
const POLICY_NAME_1 = 'test_policy_1';
const POLICY_NAME_2 = 'test_another_policy_2';
const POLICY_SNAPSHOT_NAME_1 = 'backup_snapshot';
const POLICY_SNAPSHOT_NAME_2 = 'a_snapshot';
// snapshots created without SLM policies
const BATCH_SIZE_1 = 3;
const BATCH_SIZE_2 = 5;
const BATCH_SNAPSHOT_NAME_1 = 'another_snapshot';
const BATCH_SNAPSHOT_NAME_2 = 'xyz_another_snapshot';
// total count consists of both batches' sizes + 2 snapshots created by 2 SLM policies (one each)
const SNAPSHOT_COUNT = BATCH_SIZE_1 + BATCH_SIZE_2 + 2;
// API defaults used in the UI
const PAGE_INDEX = 0;
const PAGE_SIZE = 20;
const SORT_FIELD = 'startTimeInMillis';
const SORT_DIRECTION = 'desc';

interface ApiParams {
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: string;
  searchField?: string;
  searchValue?: string;
  searchMatch?: string;
  searchOperator?: string;
}

const getApiPath = ({
  pageIndex,
  pageSize,
  sortField,
  sortDirection,
  searchField,
  searchValue,
  searchMatch,
  searchOperator,
}: ApiParams): string => {
  let path = `${API_BASE_PATH}/snapshots?sortField=${sortField ?? SORT_FIELD}&sortDirection=${
    sortDirection ?? SORT_DIRECTION
  }&pageIndex=${pageIndex ?? PAGE_INDEX}&pageSize=${pageSize ?? PAGE_SIZE}`;
  // all 4 parameters should be used at the same time to configure the correct search request
  if (searchField && searchValue && searchMatch && searchOperator) {
    path = `${path}&searchField=${searchField}&searchValue=${searchValue}&searchMatch=${searchMatch}&searchOperator=${searchOperator}`;
  }
  return path;
};

apiTest.describe('Snapshot and Restore - snapshots', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;
  // names of snapshots created by SLM policies have random suffixes, save full names for tests
  let snapshotName1: string;
  let snapshotName2: string;

  const getSnapshots = async (
    apiClient: ApiClientFixture,
    params: ApiParams
  ): Promise<{ total: number; snapshots: SnapshotDetails[] }> => {
    const response = await apiClient.get(getApiPath(params), {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    return response.body;
  };

  apiTest.beforeAll(async ({ requestAuth, esClient }) => {
    credentials = await requestAuth.getApiKeyForCustomRole(SNAPSHOT_RESTORE_ADMIN_ROLE);

    await createFsRepository(esClient, REPO_NAME_1, REPO_PATH_1);
    await createFsRepository(esClient, REPO_NAME_2, REPO_PATH_2);

    await putSlmPolicy(esClient, {
      policyName: POLICY_NAME_1,
      snapshotName: POLICY_SNAPSHOT_NAME_1,
      schedule: '0 30 1 * * ?',
      repository: REPO_NAME_1,
      config: { indices: ['default_index'], ignoreUnavailable: true },
    });
    await putSlmPolicy(esClient, {
      policyName: POLICY_NAME_2,
      snapshotName: POLICY_SNAPSHOT_NAME_2,
      schedule: '0 30 1 * * ?',
      repository: REPO_NAME_1,
      config: { indices: ['default_index'], ignoreUnavailable: true },
    });

    snapshotName1 = await executeSlmPolicy(esClient, POLICY_NAME_1);
    await waitForSnapshotToFinish(esClient, REPO_NAME_1, snapshotName1);
    snapshotName2 = await executeSlmPolicy(esClient, POLICY_NAME_2);
    await waitForSnapshotToFinish(esClient, REPO_NAME_1, snapshotName2);

    for (let i = 0; i < BATCH_SIZE_1; i++) {
      await createSnapshot(esClient, `${BATCH_SNAPSHOT_NAME_1}_${i}`, REPO_NAME_1);
    }
    for (let i = 0; i < BATCH_SIZE_2; i++) {
      await createSnapshot(esClient, `${BATCH_SNAPSHOT_NAME_2}_${i}`, REPO_NAME_2);
    }
  });

  apiTest.afterAll(async ({ esClient }) => {
    await Promise.all([
      deleteSlmPolicy(esClient, POLICY_NAME_1),
      deleteSlmPolicy(esClient, POLICY_NAME_2),
    ]);
    await deleteAllSnapshotsInRepo(esClient, REPO_NAME_1);
    await deleteAllSnapshotsInRepo(esClient, REPO_NAME_2);
    await deleteRepository(esClient, REPO_NAME_1);
    await deleteRepository(esClient, REPO_NAME_2);
  });

  // pagination
  apiTest('pagination: returns pageSize number of snapshots', async ({ apiClient }) => {
    const pageSize = 7;
    const { total, snapshots } = await getSnapshots(apiClient, { pageSize });
    expect(total).toBe(SNAPSHOT_COUNT);
    expect(snapshots).toHaveLength(pageSize);
  });

  apiTest('pagination: returns next page of snapshots', async ({ apiClient }) => {
    const pageSize = 3;
    const { snapshots: firstPageSnapshots } = await getSnapshots(apiClient, {
      pageIndex: 0,
      pageSize,
    });
    const firstPageSnapshotName = firstPageSnapshots[0].snapshot;
    expect(firstPageSnapshots).toHaveLength(pageSize);

    const { snapshots: secondPageSnapshots } = await getSnapshots(apiClient, {
      pageIndex: 1,
      pageSize,
    });
    const secondPageSnapshotName = secondPageSnapshots[0].snapshot;
    expect(secondPageSnapshots).toHaveLength(pageSize);
    expect(secondPageSnapshotName).not.toBe(firstPageSnapshotName);
  });

  // sorting
  apiTest('sorting: sorts by snapshot name (asc)', async ({ apiClient }) => {
    const { snapshots } = await getSnapshots(apiClient, {
      sortField: 'snapshot',
      sortDirection: 'asc',
    });
    /*
     * snapshots name in asc order:
     * "a_snapshot...", "another_snapshot...", "backup_snapshot...", "xyz_another_snapshot..."
     */
    // snapshotName2 is "a_snapshot..."
    expect(snapshots[0].snapshot).toBe(snapshotName2);
  });

  apiTest('sorting: sorts by snapshot name (desc)', async ({ apiClient }) => {
    const { snapshots } = await getSnapshots(apiClient, {
      sortField: 'snapshot',
      sortDirection: 'desc',
    });
    /*
     * snapshots name in desc order:
     * "xyz_another_snapshot...", "backup_snapshot...", "another_snapshot...", "a_snapshot..."
     */
    expect(snapshots[0].snapshot).toBe('xyz_another_snapshot_4');
  });

  apiTest('sorting: sorts by repository name (asc)', async ({ apiClient }) => {
    const { snapshots } = await getSnapshots(apiClient, {
      sortField: 'repository',
      sortDirection: 'asc',
    });
    // repositories in asc order: "test_another_repo_2", "test_repo_1"
    expect(snapshots[0].repository).toBe(REPO_NAME_2);
  });

  apiTest('sorting: sorts by repository name (desc)', async ({ apiClient }) => {
    const { snapshots } = await getSnapshots(apiClient, {
      sortField: 'repository',
      sortDirection: 'desc',
    });
    // repositories in desc order: "test_repo_1", "test_another_repo_2"
    expect(snapshots[0].repository).toBe(REPO_NAME_1);
  });

  apiTest('sorting: sorts by startTimeInMillis (asc)', async ({ apiClient }) => {
    const { snapshots } = await getSnapshots(apiClient, {
      sortField: 'startTimeInMillis',
      sortDirection: 'asc',
    });
    // the 1st snapshot that was created during this test setup
    expect(snapshots[0].snapshot).toBe(snapshotName1);
  });

  apiTest('sorting: sorts by startTimeInMillis (desc)', async ({ apiClient }) => {
    const { snapshots } = await getSnapshots(apiClient, {
      sortField: 'startTimeInMillis',
      sortDirection: 'desc',
    });
    // the last snapshot that was created during this test setup
    expect(snapshots[0].snapshot).toBe('xyz_another_snapshot_4');
  });

  // these properties are only tested as being accepted by the API
  const sortFields = ['indices', 'durationInMillis', 'shards.total', 'shards.failed'];
  for (const sortField of sortFields) {
    apiTest(`sorting: allows sorting by ${sortField} (asc)`, async ({ apiClient }) => {
      await getSnapshots(apiClient, { sortField, sortDirection: 'asc' });
    });

    apiTest(`sorting: allows sorting by ${sortField} (desc)`, async ({ apiClient }) => {
      await getSnapshots(apiClient, { sortField, sortDirection: 'desc' });
    });
  }

  // search - snapshot name
  apiTest('search snapshot name: exact match', async ({ apiClient }) => {
    // list snapshots with the name "another_snapshot_2"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'snapshot',
      searchValue: 'another_snapshot_2',
      searchMatch: 'must',
      searchOperator: 'exact',
    });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].snapshot).toBe('another_snapshot_2');
  });

  apiTest('search snapshot name: partial match', async ({ apiClient }) => {
    // list snapshots with the name containing "another"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'snapshot',
      searchValue: 'another',
      searchMatch: 'must',
      searchOperator: 'eq',
    });
    // both batches created snapshots containing "another" in the name
    expect(snapshots).toHaveLength(BATCH_SIZE_1 + BATCH_SIZE_2);
    const snapshotNamesContainSearch = snapshots.every((snapshot) =>
      snapshot.snapshot.includes('another')
    );
    expect(snapshotNamesContainSearch).toBe(true);
  });

  apiTest('search snapshot name: excluding search with exact match', async ({ apiClient }) => {
    // list snapshots with the name not "another_snapshot_2"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'snapshot',
      searchValue: 'another_snapshot_2',
      searchMatch: 'must_not',
      searchOperator: 'exact',
    });
    expect(snapshots).toHaveLength(SNAPSHOT_COUNT - 1);
    const snapshotIsExcluded = snapshots.every(
      (snapshot) => snapshot.snapshot !== 'another_snapshot_2'
    );
    expect(snapshotIsExcluded).toBe(true);
  });

  apiTest('search snapshot name: excluding search with partial match', async ({ apiClient }) => {
    // list snapshots with the name not starting with "another"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'snapshot',
      searchValue: 'another',
      searchMatch: 'must_not',
      searchOperator: 'eq',
    });
    // both batches created snapshots with names containing "another"
    expect(snapshots).toHaveLength(SNAPSHOT_COUNT - BATCH_SIZE_1 - BATCH_SIZE_2);
    const snapshotsAreExcluded = snapshots.every(
      (snapshot) => !snapshot.snapshot.includes('another')
    );
    expect(snapshotsAreExcluded).toBe(true);
  });

  // search - repository name
  apiTest(
    'search repository name: non-existent repository returns empty array',
    async ({ apiClient }) => {
      const { snapshots } = await getSnapshots(apiClient, {
        searchField: 'repository',
        searchValue: 'non-existent',
        searchMatch: 'must',
        searchOperator: 'exact',
      });
      expect(snapshots).toHaveLength(0);
    }
  );

  apiTest('search repository name: exact match', async ({ apiClient }) => {
    // list snapshots from repository "test_repo_1"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'repository',
      searchValue: REPO_NAME_1,
      searchMatch: 'must',
      searchOperator: 'exact',
    });
    // repo 1 contains snapshots from batch 1 and 2 snapshots created by 2 SLM policies
    expect(snapshots).toHaveLength(BATCH_SIZE_1 + 2);
    const repositoryNameMatches = snapshots.every(
      (snapshot) => snapshot.repository === REPO_NAME_1
    );
    expect(repositoryNameMatches).toBe(true);
  });

  apiTest('search repository name: partial match', async ({ apiClient }) => {
    // list snapshots from repository with the name containing "another" (i.e. repo 2)
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'repository',
      searchValue: 'another',
      searchMatch: 'must',
      searchOperator: 'eq',
    });
    // repo 2 only contains snapshots created by batch 2
    expect(snapshots).toHaveLength(BATCH_SIZE_2);
    const repositoryNameMatches = snapshots.every((snapshot) =>
      snapshot.repository.includes('another')
    );
    expect(repositoryNameMatches).toBe(true);
  });

  apiTest('search repository name: excluding search with exact match', async ({ apiClient }) => {
    // list snapshots from repositories with the name not "test_repo_1"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'repository',
      searchValue: REPO_NAME_1,
      searchMatch: 'must_not',
      searchOperator: 'exact',
    });
    // snapshots not in repo 1 are only snapshots created in batch 2
    expect(snapshots).toHaveLength(BATCH_SIZE_2);
    const repositoryNameMatches = snapshots.every(
      (snapshot) => snapshot.repository !== REPO_NAME_1
    );
    expect(repositoryNameMatches).toBe(true);
  });

  apiTest('search repository name: excluding search with partial match', async ({ apiClient }) => {
    // list snapshots from repository with the name not containing "test"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'repository',
      searchValue: 'test',
      searchMatch: 'must_not',
      searchOperator: 'eq',
    });
    expect(snapshots).toHaveLength(0);
  });

  // search - policy name
  apiTest('search policy name: non-existent policy returns empty array', async ({ apiClient }) => {
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'policyName',
      searchValue: 'non-existent',
      searchMatch: 'must',
      searchOperator: 'exact',
    });
    expect(snapshots).toHaveLength(0);
  });

  apiTest('search policy name: exact match', async ({ apiClient }) => {
    // list snapshots created by the policy "test_policy_1"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'policyName',
      searchValue: POLICY_NAME_1,
      searchMatch: 'must',
      searchOperator: 'exact',
    });
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].policyName).toBe(POLICY_NAME_1);
  });

  apiTest('search policy name: partial match', async ({ apiClient }) => {
    // list snapshots created by the policy with the name containing "another"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'policyName',
      searchValue: 'another',
      searchMatch: 'must',
      searchOperator: 'eq',
    });
    // 1 snapshot was created by the policy "test_another_policy_2"
    expect(snapshots).toHaveLength(1);
    const policyNameMatches = snapshots.every((snapshot) =>
      (snapshot.policyName ?? '').includes('another')
    );
    expect(policyNameMatches).toBe(true);
  });

  apiTest('search policy name: excluding search with exact match', async ({ apiClient }) => {
    // list snapshots created by the policy with the name not "test_policy_1"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'policyName',
      searchValue: POLICY_NAME_1,
      searchMatch: 'must_not',
      searchOperator: 'exact',
    });
    // only 1 snapshot was created by policy 1
    // search results should also contain snapshots without SLM policy
    expect(snapshots).toHaveLength(SNAPSHOT_COUNT - 1);
    const snapshotsExcluded = snapshots.every(
      (snapshot) => (snapshot.policyName ?? '') !== POLICY_NAME_1
    );
    expect(snapshotsExcluded).toBe(true);
  });

  apiTest('search policy name: excluding search with partial match', async ({ apiClient }) => {
    // list snapshots created by the policy with the name not containing "another"
    const { snapshots } = await getSnapshots(apiClient, {
      searchField: 'policyName',
      searchValue: 'another',
      searchMatch: 'must_not',
      searchOperator: 'eq',
    });
    // only 1 snapshot was created by SLM policy containing "another" in the name
    // search results should also contain snapshots without SLM policy
    expect(snapshots).toHaveLength(SNAPSHOT_COUNT - 1);
    const snapshotsExcluded = snapshots.every(
      (snapshot) => !(snapshot.policyName ?? '').includes('another')
    );
    expect(snapshotsExcluded).toBe(true);
  });
});
