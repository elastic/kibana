/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import type { MlAction } from '../../../common/types';
import { setupEnvironment } from '../helpers/setup_environment';
import { setupElasticsearchPage } from './es_deprecations.helpers';
import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

describe('Machine learning deprecation flyout', () => {
  let esDeprecationsResponse: typeof esDeprecationsMockResponse;
  let mlDeprecation: (typeof esDeprecationsMockResponse.migrationsDeprecations)[number];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  const openFlyout = async () => {
    fireEvent.click(screen.getAllByTestId('deprecation-mlSnapshot')[0]);
    return await screen.findByTestId('mlSnapshotDetails');
  };

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    // Tests can mutate the loaded deprecations in-memory; ensure isolation by cloning per test.
    esDeprecationsResponse = JSON.parse(JSON.stringify(esDeprecationsMockResponse));
    mlDeprecation = esDeprecationsResponse.migrationsDeprecations[0];

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsResponse);
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
  });

  test('renders a flyout with deprecation details', async () => {
    await setupElasticsearchPage(httpSetup);
    const flyout = await openFlyout();

    expect(flyout).toBeInTheDocument();
    expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
      'Upgrade or delete model snapshot'
    );
    expect(
      (within(flyout).getByTestId('documentationLink') as HTMLAnchorElement).getAttribute('href')
    ).toBe(mlDeprecation.url);
  });

  describe('upgrade snapshots', () => {
    it('successfully upgrades snapshots', async () => {
      httpRequestsMockHelpers.setUpgradeMlSnapshotResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'in_progress',
      });

      await setupElasticsearchPage(httpSetup);
      const flyout = await openFlyout();

      expect(within(flyout).getByTestId('criticalDeprecationBadge')).toBeInTheDocument();
      expect(within(flyout).getByTestId('upgradeSnapshotButton')).toHaveTextContent('Upgrade');

      fireEvent.click(within(flyout).getByTestId('upgradeSnapshotButton'));

      // After the upgrade request starts, the status polling should resolve as complete.
      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'complete',
      });

      // First, we expect a POST request to upgrade the snapshot
      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          '/api/upgrade_assistant/ml_snapshots',
          expect.anything()
        );
      });

      // Next, we expect a GET request to check the status of the upgrade
      await waitFor(() => {
        expect(httpSetup.get).toHaveBeenLastCalledWith(
          `/api/upgrade_assistant/ml_snapshots/${MOCK_JOB_ID}/${MOCK_SNAPSHOT_ID}`,
          expect.anything()
        );
      });

      // Verify the "Resolution" column of the table is updated
      await waitFor(() => {
        expect(screen.getAllByTestId('mlActionResolutionCell')[0]).toHaveTextContent(
          'Upgrade complete'
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('mlSnapshotDetails')).toBeNull();
      });

      // Reopen the flyout
      const reopenedFlyout = await openFlyout();

      // Flyout actions should be hidden if deprecation was resolved
      expect(within(reopenedFlyout).queryByTestId('upgradeSnapshotButton')).toBeNull();
      expect(within(reopenedFlyout).queryByTestId('deleteSnapshotButton')).toBeNull();
      // Badge should be updated in flyout title
      expect(within(reopenedFlyout).getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
    });

    it('handles upgrade failure', async () => {
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

      await setupElasticsearchPage(httpSetup);
      const flyout = await openFlyout();

      fireEvent.click(within(flyout).getByTestId('upgradeSnapshotButton'));

      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          '/api/upgrade_assistant/ml_snapshots',
          expect.anything()
        );
      });

      // Verify the "Resolution" column of the table is updated
      await waitFor(() => {
        expect(screen.getAllByTestId('mlActionResolutionCell')[0]).toHaveTextContent(
          'Upgrade failed'
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('mlSnapshotDetails')).toBeNull();
      });

      // Reopen the flyout
      const reopenedFlyout = await openFlyout();

      // Verify the flyout shows an error message
      expect(within(reopenedFlyout).getByTestId('resolveSnapshotError')).toHaveTextContent(
        'Error upgrading snapshot'
      );
      // Verify the upgrade button text changes
      expect(within(reopenedFlyout).getByTestId('upgradeSnapshotButton')).toHaveTextContent(
        'Retry upgrade'
      );
    });

    it('Disables actions if ml_upgrade_mode is enabled', async () => {
      httpRequestsMockHelpers.setLoadMlUpgradeModeResponse({
        mlUpgradeModeEnabled: true,
      });

      await setupElasticsearchPage(httpSetup);
      const flyout = await openFlyout();

      // Shows an error callout with a docs link
      expect(within(flyout).getByTestId('mlUpgradeModeEnabledError')).toBeInTheDocument();
      expect(within(flyout).getByTestId('setUpgradeModeDocsLink')).toBeInTheDocument();
      // Flyout actions should be hidden
      expect(within(flyout).queryByTestId('upgradeSnapshotButton')).toBeNull();
      expect(within(flyout).queryByTestId('deleteSnapshotButton')).toBeNull();
    });
  });

  describe('delete snapshots', () => {
    it('successfully deletes snapshots', async () => {
      const jobId = (mlDeprecation.correctiveAction! as MlAction).jobId;
      const snapshotId = (mlDeprecation.correctiveAction! as MlAction).snapshotId;
      httpRequestsMockHelpers.setDeleteMlSnapshotResponse(jobId, snapshotId, {
        acknowledged: true,
      });

      await setupElasticsearchPage(httpSetup);
      const flyout = await openFlyout();

      expect(within(flyout).getByTestId('criticalDeprecationBadge')).toBeInTheDocument();
      expect(within(flyout).getByTestId('deleteSnapshotButton')).toHaveTextContent('Delete');

      fireEvent.click(within(flyout).getByTestId('deleteSnapshotButton'));

      await waitFor(() => {
        expect(httpSetup.delete).toHaveBeenLastCalledWith(
          `/api/upgrade_assistant/ml_snapshots/${jobId}/${snapshotId}`,
          expect.anything()
        );
      });

      // Verify the "Resolution" column of the table is updated
      await waitFor(() => {
        expect(screen.getAllByTestId('mlActionResolutionCell')[0]).toHaveTextContent(
          'Deletion complete'
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('mlSnapshotDetails')).toBeNull();
      });

      // Reopen the flyout
      const reopenedFlyout = await openFlyout();

      // Flyout actions should be hidden if deprecation was resolved
      expect(within(reopenedFlyout).queryByTestId('upgradeSnapshotButton')).toBeNull();
      expect(within(reopenedFlyout).queryByTestId('deleteSnapshotButton')).toBeNull();
      // Badge should be updated in flyout title
      expect(within(reopenedFlyout).getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
    });

    it('handles delete failure', async () => {
      const error = {
        statusCode: 500,
        error: 'Upgrade snapshot error',
        message: 'Upgrade snapshot error',
      };

      const jobId = (mlDeprecation.correctiveAction! as MlAction).jobId;
      const snapshotId = (mlDeprecation.correctiveAction! as MlAction).snapshotId;
      httpRequestsMockHelpers.setDeleteMlSnapshotResponse(jobId, snapshotId, undefined, error);

      await setupElasticsearchPage(httpSetup);
      const flyout = await openFlyout();

      fireEvent.click(within(flyout).getByTestId('deleteSnapshotButton'));

      await waitFor(() => {
        expect(httpSetup.delete).toHaveBeenLastCalledWith(
          `/api/upgrade_assistant/ml_snapshots/${jobId}/${snapshotId}`,
          expect.anything()
        );
      });

      // Verify the "Resolution" column of the table is updated
      await waitFor(() => {
        expect(screen.getAllByTestId('mlActionResolutionCell')[0]).toHaveTextContent(
          'Deletion failed'
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('mlSnapshotDetails')).toBeNull();
      });

      // Reopen the flyout
      const reopenedFlyout = await openFlyout();

      // Verify the flyout shows an error message
      expect(within(reopenedFlyout).getByTestId('resolveSnapshotError')).toHaveTextContent(
        'Error deleting snapshot'
      );
      // Verify the upgrade button text changes
      expect(within(reopenedFlyout).getByTestId('deleteSnapshotButton')).toHaveTextContent(
        'Retry delete'
      );
    });
  });
});
