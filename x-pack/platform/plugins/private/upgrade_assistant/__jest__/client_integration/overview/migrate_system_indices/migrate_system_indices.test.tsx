/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { setupEnvironment } from '../../helpers/setup_environment';
import { setupOverviewPage } from '../overview.helpers';
import { systemIndicesMigrationErrorStatus } from './mocks';

describe('Overview - Migrate system indices', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('Error state', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(undefined, {
        statusCode: 400,
        message: 'error',
      });

      await setupOverviewPage(httpSetup);
    });

    test('Is rendered', () => {
      expect(screen.getByTestId('systemIndicesStatusErrorCallout')).toBeInTheDocument();
    });

    test('Lets the user attempt to reload migration status', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'NO_MIGRATION_NEEDED',
      });

      fireEvent.click(screen.getByTestId('systemIndicesStatusRetryButton'));
      await waitFor(() => {
        expect(screen.getByTestId('noMigrationNeededSection')).toBeInTheDocument();
      });
    });
  });

  test('No migration needed', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'NO_MIGRATION_NEEDED',
    });

    await setupOverviewPage(httpSetup);

    expect(screen.getByTestId('noMigrationNeededSection')).toBeInTheDocument();
    expect(screen.queryByTestId('startSystemIndicesMigrationButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('viewSystemIndicesStateButton')).not.toBeInTheDocument();
  });

  test('Migration in progress', async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'IN_PROGRESS',
    });

    await setupOverviewPage(httpSetup);

    expect(screen.getByTestId('startSystemIndicesMigrationButton')).toBeDisabled();
    expect(screen.getByTestId('viewSystemIndicesStateButton')).toBeInTheDocument();
  });

  describe('Migration needed', () => {
    test('Initial state', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'MIGRATION_NEEDED',
      });

      await setupOverviewPage(httpSetup);

      expect(screen.getByTestId('startSystemIndicesMigrationButton')).toBeEnabled();
      expect(screen.getByTestId('viewSystemIndicesStateButton')).toBeInTheDocument();
    });

    test('handles confirmModal submission', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'MIGRATION_NEEDED',
      });

      await setupOverviewPage(httpSetup);

      fireEvent.click(screen.getByTestId('startSystemIndicesMigrationButton'));
      const modal = await screen.findByTestId('migrationConfirmModal');
      const confirmButton = within(modal).getByTestId('confirmModalConfirmButton');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByTestId('migrationConfirmModal')).not.toBeInTheDocument();
      });
    });

    test('Handles errors when migrating', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'MIGRATION_NEEDED',
      });
      httpRequestsMockHelpers.setSystemIndicesMigrationResponse(undefined, {
        statusCode: 400,
        message: 'error',
      });

      await setupOverviewPage(httpSetup);

      fireEvent.click(screen.getByTestId('startSystemIndicesMigrationButton'));
      const modal = await screen.findByTestId('migrationConfirmModal');
      fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(screen.getByTestId('startSystemIndicesMigrationCalloutError')).toBeInTheDocument();
      });
      expect(screen.getByTestId('startSystemIndicesMigrationButton')).toBeEnabled();
    });

    test('Shows migration error with details', async () => {
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus(
        systemIndicesMigrationErrorStatus
      );

      await setupOverviewPage(httpSetup);

      expect(screen.getByTestId('migrationFailedCallout')).toBeInTheDocument();
      expect(screen.getByTestId('migrationFailedCallout')).toHaveTextContent(
        'Errors occurred while migrating system indices:kibana: mapper_parsing_exception'
      );

      // CTA is enabled
      expect(screen.getByTestId('startSystemIndicesMigrationButton')).toBeInTheDocument();
    });
  });
});
