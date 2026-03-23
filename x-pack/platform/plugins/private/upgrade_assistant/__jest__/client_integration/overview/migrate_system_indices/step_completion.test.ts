/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { setupOverviewPage } from '../overview.helpers';
import { setupEnvironment } from '../../helpers/setup_environment';
import { advanceTime } from '../../helpers/time_manipulation';
import { SYSTEM_INDICES_MIGRATION_POLL_INTERVAL_MS } from '../../../../common/constants';

describe('Overview - Migrate system indices - Step completion', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  const setupPage = async () => {
    await setupOverviewPage(httpSetup, {
      featureSet: {
        migrateSystemIndices: true,
      },
    });
  };

  test(`It's complete when no upgrade is needed`, async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'NO_MIGRATION_NEEDED',
    });

    await setupPage();
    expect(await screen.findByTestId('migrateSystemIndicesStep-complete')).toBeInTheDocument();
  });

  test(`It's incomplete when migration is needed`, async () => {
    httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
      migration_status: 'MIGRATION_NEEDED',
    });

    await setupPage();
    expect(await screen.findByTestId('migrateSystemIndicesStep-incomplete')).toBeInTheDocument();
  });

  describe('Poll for new status', () => {
    beforeEach(async () => {
      jest.useFakeTimers();

      // First request should make the step be incomplete
      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'IN_PROGRESS',
      });

      await setupPage();

      // Wait for the initial status to be loaded and reflected in the UI.
      await waitFor(() => {
        expect(screen.getByTestId('startSystemIndicesMigrationButton')).toHaveTextContent(
          'Migration in progress'
        );
      });
    });

    afterEach(async () => {
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    test('renders step as complete when a upgraded needed status is followed by a no upgrade needed', async () => {
      expect(screen.getByTestId('migrateSystemIndicesStep-incomplete')).toBeInTheDocument();

      httpRequestsMockHelpers.setLoadSystemIndicesMigrationStatus({
        migration_status: 'NO_MIGRATION_NEEDED',
      });

      // Resolve the polling timeout.
      await advanceTime(SYSTEM_INDICES_MIGRATION_POLL_INTERVAL_MS);
      expect(await screen.findByTestId('noMigrationNeededSection')).toBeInTheDocument();

      expect(await screen.findByTestId('migrateSystemIndicesStep-complete')).toBeInTheDocument();
    });
  });
});
