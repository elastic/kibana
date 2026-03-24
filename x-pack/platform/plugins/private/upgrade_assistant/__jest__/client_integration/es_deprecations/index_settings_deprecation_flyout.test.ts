/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { setupEnvironment } from '../helpers/setup_environment';
import { setupElasticsearchPage } from './es_deprecations.helpers';
import {
  esDeprecationsMockResponse,
  MOCK_SNAPSHOT_ID,
  MOCK_JOB_ID,
  MOCK_REINDEX_DEPRECATION,
} from './mocked_responses';

describe('Index settings deprecation flyout', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  const indexSettingDeprecation = esDeprecationsMockResponse.migrationsDeprecations[1];

  const openFlyout = async () => {
    fireEvent.click(screen.getAllByTestId('deprecation-indexSetting')[0]);
    return await screen.findByTestId('indexSettingsDetails');
  };

  beforeEach(() => {
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
    httpRequestsMockHelpers.setReindexStatusResponse(MOCK_REINDEX_DEPRECATION.index!, {
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

  it('renders a flyout with deprecation details', async () => {
    await setupElasticsearchPage(httpSetup);
    const flyout = await openFlyout();

    expect(flyout).toBeInTheDocument();
    expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
      indexSettingDeprecation.message
    );
    expect(
      (within(flyout).getByTestId('documentationLink') as HTMLAnchorElement).getAttribute('href')
    ).toBe(indexSettingDeprecation.url);
    expect(within(flyout).getByTestId('removeSettingsPrompt')).toBeInTheDocument();
  });

  it('removes deprecated index settings', async () => {
    httpRequestsMockHelpers.setUpdateIndexSettingsResponse(indexSettingDeprecation.index!, {
      acknowledged: true,
    });

    await setupElasticsearchPage(httpSetup);
    const flyout = await openFlyout();

    expect(within(flyout).getByTestId('warningDeprecationBadge')).toBeInTheDocument();

    fireEvent.click(within(flyout).getByTestId('deleteSettingsButton'));

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    await waitFor(() => {
      expect(screen.getAllByTestId('indexSettingsResolutionStatusCell')[0]).toHaveTextContent(
        'Deprecated settings removed'
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('indexSettingsDetails')).toBeNull();
    });

    // Reopen the flyout
    const reopenedFlyout = await openFlyout();

    // Verify prompt to remove setting no longer displays
    expect(within(reopenedFlyout).queryByTestId('removeSettingsPrompt')).toBeNull();
    // Verify the action button no longer displays
    expect(within(reopenedFlyout).queryByTestId('deleteSettingsButton')).toBeNull();
    // Verify the badge got marked as resolved
    expect(within(reopenedFlyout).getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
  });

  it('handles failure', async () => {
    const error = {
      statusCode: 500,
      error: 'Remove index settings error',
      message: 'Remove index settings error',
    };

    httpRequestsMockHelpers.setUpdateIndexSettingsResponse(
      indexSettingDeprecation.index!,
      undefined,
      error
    );

    await setupElasticsearchPage(httpSetup);
    const flyout = await openFlyout();
    fireEvent.click(within(flyout).getByTestId('deleteSettingsButton'));

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/${indexSettingDeprecation.index!}/index_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    await waitFor(() => {
      expect(screen.getAllByTestId('indexSettingsResolutionStatusCell')[0]).toHaveTextContent(
        'Settings removal failed'
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('indexSettingsDetails')).toBeNull();
    });

    // Reopen the flyout
    const reopenedFlyout = await openFlyout();

    // Verify the flyout shows an error message
    expect(within(reopenedFlyout).getByTestId('deleteSettingsError')).toHaveTextContent(
      'Error deleting index settings'
    );
    // Verify the remove settings button text changes
    expect(within(reopenedFlyout).getByTestId('deleteSettingsButton')).toHaveTextContent(
      'Retry removing deprecated settings'
    );
  });
});
