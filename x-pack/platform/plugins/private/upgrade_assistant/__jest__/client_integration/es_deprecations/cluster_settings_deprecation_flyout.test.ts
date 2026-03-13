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
import { esDeprecationsMockResponse } from './mocked_responses';
import { MOCK_REINDEX_DEPRECATION } from './mocked_responses';

describe('Cluster settings deprecation flyout', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  const clusterSettingDeprecation = esDeprecationsMockResponse.migrationsDeprecations[4];

  const openFlyout = async () => {
    fireEvent.click(screen.getAllByTestId('deprecation-clusterSetting')[0]);
    return await screen.findByTestId('clusterSettingsDetails');
  };

  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;

    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
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

  test('renders a flyout with deprecation details', async () => {
    await setupElasticsearchPage(httpSetup);
    const flyout = await openFlyout();

    expect(flyout).toBeInTheDocument();
    expect(within(flyout).getByTestId('flyoutTitle')).toHaveTextContent(
      clusterSettingDeprecation.message
    );
    expect(
      (within(flyout).getByTestId('documentationLink') as HTMLAnchorElement).getAttribute('href')
    ).toBe(clusterSettingDeprecation.url);
    expect(within(flyout).getByTestId('removeClusterSettingsPrompt')).toBeInTheDocument();
  });

  it('removes deprecated cluster settings', async () => {
    httpRequestsMockHelpers.setClusterSettingsResponse({
      acknowledged: true,
      persistent: {},
      transietn: {},
    });

    await setupElasticsearchPage(httpSetup);
    const flyout = await openFlyout();

    expect(within(flyout).getByTestId('warningDeprecationBadge')).toBeInTheDocument();

    fireEvent.click(within(flyout).getByTestId('deleteClusterSettingsButton'));

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/cluster_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    await waitFor(() => {
      expect(screen.getAllByTestId('clusterSettingsResolutionStatusCell')[0]).toHaveTextContent(
        'Deprecated settings removed'
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('clusterSettingsDetails')).toBeNull();
    });

    // Reopen the flyout
    const reopenedFlyout = await openFlyout();

    // Verify prompt to remove setting no longer displays
    expect(within(reopenedFlyout).queryByTestId('removeClusterSettingsPrompt')).toBeNull();
    // Verify the action button no longer displays
    expect(within(reopenedFlyout).queryByTestId('deleteClusterSettingsButton')).toBeNull();
    // Verify the badge got marked as resolved
    expect(within(reopenedFlyout).getByTestId('resolvedDeprecationBadge')).toBeInTheDocument();
  });

  it('handles failure', async () => {
    const error = {
      statusCode: 500,
      error: 'Remove cluster settings error',
      message: 'Remove cluster settings error',
    };

    httpRequestsMockHelpers.setClusterSettingsResponse(undefined, error);

    await setupElasticsearchPage(httpSetup);
    const flyout = await openFlyout();

    fireEvent.click(within(flyout).getByTestId('deleteClusterSettingsButton'));

    expect(httpSetup.post).toHaveBeenLastCalledWith(
      `/api/upgrade_assistant/cluster_settings`,
      expect.anything()
    );

    // Verify the "Resolution" column of the table is updated
    await waitFor(() => {
      expect(screen.getAllByTestId('clusterSettingsResolutionStatusCell')[0]).toHaveTextContent(
        'Settings removal failed'
      );
    });

    await waitFor(() => {
      expect(screen.queryByTestId('clusterSettingsDetails')).toBeNull();
    });

    // Reopen the flyout
    const reopenedFlyout = await openFlyout();

    // Verify the flyout shows an error message
    expect(within(reopenedFlyout).getByTestId('deleteClusterSettingsError')).toHaveTextContent(
      'Error deleting cluster settings'
    );
    // Verify the remove settings button text changes
    expect(within(reopenedFlyout).getByTestId('deleteClusterSettingsButton')).toHaveTextContent(
      'Retry removing deprecated settings'
    );
  });
});
