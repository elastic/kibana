/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import { MOCK_REINDEX_DEPRECATION } from './mocked_responses';
import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

describe('ES deprecations batch reindexing', () => {
  let testBed: ElasticsearchTestBed;
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
      nodeId: 'my_node',
      snapshotId: MOCK_SNAPSHOT_ID,
      jobId: MOCK_JOB_ID,
      status: 'idle',
    });
    httpRequestsMockHelpers.setReindexStatusResponse('reindex_index', {
      reindexOp: null,
      warnings: [],
      hasRequiredPrivileges: true,
      meta: {
        indexName: 'foo',
        reindexName: 'reindexed-foo',
        aliases: [],
      },
    });
    httpRequestsMockHelpers.setLoadRemoteClustersResponse([]);

    await act(async () => {
      testBed = await setupElasticsearchPage(httpSetup);
    });

    testBed.component.update();
  });

  it('Reindex deprecations can be selected for reindexing', async () => {
    const { exists, find, actions } = testBed;

    // Make sure that non reindexable deprecations are disabled
    await actions.table.toggleRowSelection(0);
    expect(exists('openShowReindexModal')).toBe(false);

    // And that reindexable deprecations are enabled
    await actions.table.toggleRowSelection(1);
    expect(exists('openShowReindexModal')).toBe(true);

    await actions.table.openBatchReindexModal();

    expect(find('consoleRequest').text()).toContain('POST kbn:api/upgrade_assistant/reindex/batch');
    expect(find('consoleRequest').text()).toContain(MOCK_REINDEX_DEPRECATION.index);
  });
});
