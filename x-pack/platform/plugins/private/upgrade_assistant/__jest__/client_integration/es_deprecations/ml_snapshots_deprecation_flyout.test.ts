/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import type { MlAction } from '../../../common/types';
import { setupEnvironment } from '../helpers';
import { ElasticsearchTestBed, setupElasticsearchPage } from './es_deprecations.helpers';
import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

describe('Machine learning deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;
  const mlDeprecation = esDeprecationsMockResponse.migrationsDeprecations[0];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(async () => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setLoadMlUpgradeModeResponse({ mlUpgradeModeEnabled: false });
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

    await act(async () => {
      testBed = await setupElasticsearchPage(mockEnvironment.httpSetup);
    });

    const { actions, component } = testBed;
    component.update();
    await actions.table.clickDeprecationRowAt('mlSnapshot', 0);
  });

  test('renders a flyout with deprecation details', async () => {
    const { find, exists } = testBed;

    expect(exists('mlSnapshotDetails')).toBe(true);
    expect(find('mlSnapshotDetails.flyoutTitle').text()).toContain(
      'Upgrade or delete model snapshot'
    );
    expect(find('mlSnapshotDetails.documentationLink').props().href).toBe(mlDeprecation.url);
  });

  describe('upgrade snapshots', () => {
    it('successfully upgrades snapshots', async () => {
      const { find, actions, exists } = testBed;

      httpRequestsMockHelpers.setUpgradeMlSnapshotResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'in_progress',
      });

      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'complete',
      });

      expect(exists('mlSnapshotDetails.criticalDeprecationBadge')).toBe(true);
      expect(find('mlSnapshotDetails.upgradeSnapshotButton').text()).toEqual('Upgrade');

      await actions.mlDeprecationFlyout.clickUpgradeSnapshot();

      // First, we expect a POST request to upgrade the snapshot
      expect(httpSetup.post).toHaveBeenLastCalledWith(
        '/api/upgrade_assistant/ml_snapshots',
        expect.anything()
      );

      // Next, we expect a GET request to check the status of the upgrade
      expect(httpSetup.get).toHaveBeenLastCalledWith(
        `/api/upgrade_assistant/ml_snapshots/${MOCK_JOB_ID}/${MOCK_SNAPSHOT_ID}`,
        expect.anything()
      );

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').text()).toContain('Upgrade complete');

      // Reopen the flyout
      await actions.table.clickDeprecationRowAt('mlSnapshot', 0);

      // Flyout actions should be hidden if deprecation was resolved
      expect(exists('mlSnapshotDetails.upgradeSnapshotButton')).toBe(false);
      expect(exists('mlSnapshotDetails.deleteSnapshotButton')).toBe(false);
      // Badge should be updated in flyout title
      expect(exists('mlSnapshotDetails.resolvedDeprecationBadge')).toBe(true);
    });

    it('handles upgrade failure', async () => {
      const { find, actions } = testBed;

      const error = {
        statusCode: 500,
        error: 'Upgrade snapshot error',
        message: 'Upgrade snapshot error',
      };

      httpRequestsMockHelpers.setUpgradeMlSnapshotResponse(undefined, error);
      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'error',
        error,
      });

      await actions.mlDeprecationFlyout.clickUpgradeSnapshot();

      expect(httpSetup.post).toHaveBeenLastCalledWith(
        '/api/upgrade_assistant/ml_snapshots',
        expect.anything()
      );

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').text()).toContain('Upgrade failed');

      // Reopen the flyout
      await actions.table.clickDeprecationRowAt('mlSnapshot', 0);

      // Verify the flyout shows an error message
      expect(find('mlSnapshotDetails.resolveSnapshotError').text()).toContain(
        'Error upgrading snapshot'
      );
      // Verify the upgrade button text changes
      expect(find('mlSnapshotDetails.upgradeSnapshotButton').text()).toEqual('Retry upgrade');
    });

    it('Disables actions if ml_upgrade_mode is enabled', async () => {
      httpRequestsMockHelpers.setLoadMlUpgradeModeResponse({
        mlUpgradeModeEnabled: true,
      });

      await act(async () => {
        testBed = await setupElasticsearchPage(httpSetup);
      });

      const { actions, exists, component } = testBed;

      component.update();

      await actions.table.clickDeprecationRowAt('mlSnapshot', 0);

      // Shows an error callout with a docs link
      expect(exists('mlSnapshotDetails.mlUpgradeModeEnabledError')).toBe(true);
      expect(exists('mlSnapshotDetails.setUpgradeModeDocsLink')).toBe(true);
      // Flyout actions should be hidden
      expect(exists('mlSnapshotDetails.upgradeSnapshotButton')).toBe(false);
      expect(exists('mlSnapshotDetails.deleteSnapshotButton')).toBe(false);
    });
  });

  describe('delete snapshots', () => {
    it('successfully deletes snapshots', async () => {
      const { find, actions, exists } = testBed;

      const jobId = (mlDeprecation.correctiveAction! as MlAction).jobId;
      const snapshotId = (mlDeprecation.correctiveAction! as MlAction).snapshotId;
      httpRequestsMockHelpers.setDeleteMlSnapshotResponse(jobId, snapshotId, {
        acknowledged: true,
      });

      expect(exists('mlSnapshotDetails.criticalDeprecationBadge')).toBe(true);
      expect(find('mlSnapshotDetails.deleteSnapshotButton').text()).toEqual('Delete');

      await actions.mlDeprecationFlyout.clickDeleteSnapshot();

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `/api/upgrade_assistant/ml_snapshots/${jobId}/${snapshotId}`,
        expect.anything()
      );

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').at(0).text()).toEqual('Deletion complete');

      // Reopen the flyout
      await actions.table.clickDeprecationRowAt('mlSnapshot', 0);

      // Flyout actions should be hidden if deprecation was resolved
      expect(exists('mlSnapshotDetails.upgradeSnapshotButton')).toBe(false);
      expect(exists('mlSnapshotDetails.deleteSnapshotButton')).toBe(false);
      // Badge should be updated in flyout title
      expect(exists('mlSnapshotDetails.resolvedDeprecationBadge')).toBe(true);
    });

    it('handles delete failure', async () => {
      const { find, actions } = testBed;

      const error = {
        statusCode: 500,
        error: 'Upgrade snapshot error',
        message: 'Upgrade snapshot error',
      };

      const jobId = (mlDeprecation.correctiveAction! as MlAction).jobId;
      const snapshotId = (mlDeprecation.correctiveAction! as MlAction).snapshotId;
      httpRequestsMockHelpers.setDeleteMlSnapshotResponse(jobId, snapshotId, undefined, error);

      await actions.mlDeprecationFlyout.clickDeleteSnapshot();

      expect(httpSetup.delete).toHaveBeenLastCalledWith(
        `/api/upgrade_assistant/ml_snapshots/${jobId}/${snapshotId}`,
        expect.anything()
      );

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').at(0).text()).toEqual('Deletion failed');

      // Reopen the flyout
      await actions.table.clickDeprecationRowAt('mlSnapshot', 0);

      // Verify the flyout shows an error message
      expect(find('mlSnapshotDetails.resolveSnapshotError').text()).toContain(
        'Error deleting snapshot'
      );
      // Verify the upgrade button text changes
      expect(find('mlSnapshotDetails.deleteSnapshotButton').text()).toEqual('Retry delete');
    });
  });
});
