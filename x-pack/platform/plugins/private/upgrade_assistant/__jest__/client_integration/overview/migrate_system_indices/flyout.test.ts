/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startCase } from 'lodash';
import { screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import { setupOverviewPage } from '../overview.helpers';
import { setupEnvironment } from '../../helpers/setup_environment';
import { systemIndicesMigrationStatus, systemIndicesMigrationErrorStatus } from './mocks';

describe('Overview - Migrate system indices - Flyout', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let user: ReturnType<typeof userEvent.setup>;
  beforeEach(() => {
    user = userEvent.setup();
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  test('shows correct features in flyout table', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(systemIndicesMigrationStatus);
    await setupOverviewPage(httpSetup);

    await user.click(await screen.findByTestId('viewSystemIndicesStateButton'));

    const flyoutDetails = await screen.findByTestId('flyoutDetails');
    const table = within(flyoutDetails).getByTestId('featuresTable');

    const rows = within(table).getAllByRole('row');
    expect(rows.length - 1).toBe(systemIndicesMigrationStatus.features.length);

    systemIndicesMigrationStatus.features.forEach((feature) => {
      const featureName = startCase(feature.feature_name);
      const row = rows.find((r) => within(r).queryByText(featureName) !== null);
      expect(row).toBeDefined();

      const expectedStatusText =
        feature.migration_status === 'NO_MIGRATION_NEEDED'
          ? 'Migration complete'
          : feature.migration_status === 'MIGRATION_NEEDED'
          ? 'Migration required'
          : feature.migration_status === 'IN_PROGRESS'
          ? 'Migration in progress'
          : 'Migration failed';

      expect(within(row!).getByText(expectedStatusText)).toBeInTheDocument();
    });
  });

  test('can trigger the migration', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(systemIndicesMigrationStatus);
    await setupOverviewPage(httpSetup);

    await user.click(await screen.findByTestId('startSystemIndicesMigrationButton'));

    const modal = await screen.findByTestId('migrationConfirmModal');
    await user.click(within(modal).getByTestId('confirmModalConfirmButton'));

    expect(screen.queryByTestId('migrationConfirmModal')).not.toBeInTheDocument();
  });

  test('disables migrate button when migrating', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'IN_PROGRESS',
    });

    await setupOverviewPage(httpSetup);
    expect(await screen.findByTestId('startSystemIndicesMigrationButton')).toBeDisabled();
  });

  test('hides the start migration button when finished', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'NO_MIGRATION_NEEDED',
    });

    await setupOverviewPage(httpSetup);
    expect(screen.queryByTestId('startSystemIndicesMigrationButton')).not.toBeInTheDocument();
  });

  test('shows migration errors inline within the table row', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(systemIndicesMigrationErrorStatus);

    await setupOverviewPage(httpSetup);

    await user.click(await screen.findByTestId('viewSystemIndicesStateButton'));

    const flyoutDetails = await screen.findByTestId('flyoutDetails');
    const table = within(flyoutDetails).getByTestId('featuresTable');

    const rows = within(table).getAllByRole('row');
    const firstFeature = systemIndicesMigrationErrorStatus.features[0];
    const featureName = startCase(firstFeature.feature_name);

    const row = rows.find((r) => within(r).queryByText(featureName) !== null);
    expect(row).toBeDefined();
    expect(within(row!).getByText('Migration failed')).toBeInTheDocument();

    await user.click(within(row!).getByLabelText('Expand'));

    // Expanded row content is rendered by EuiInMemoryTable via itemIdToExpandedRowMap
    // and should include the failed indices and their error reasons.
    expect(await within(flyoutDetails).findByText('.kibana')).toBeInTheDocument();
    expect(within(flyoutDetails).getAllByText('mapper_parsing_exception')).toHaveLength(2);
  });
});
