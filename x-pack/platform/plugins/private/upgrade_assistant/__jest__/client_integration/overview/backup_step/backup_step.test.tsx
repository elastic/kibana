/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS,
  CLOUD_SNAPSHOT_REPOSITORY,
} from '../../../../common/constants';
import { act } from 'react-dom/test-utils';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { setupEnvironment } from '../../helpers/setup_environment';
import { advanceTime } from '../../helpers/time_manipulation';
import { setupOverviewPage } from '../overview.helpers';

describe('Overview - Backup Step', () => {
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];
  let setDelayResponse: ReturnType<typeof setupEnvironment>['setDelayResponse'];
  beforeEach(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
    setDelayResponse = mockEnvironment.setDelayResponse;
  });

  describe('On-prem', () => {
    beforeEach(async () => {
      await setupOverviewPage(httpSetup);
    });

    test('Shows link to Snapshot and Restore', () => {
      const link = screen.getByTestId('snapshotRestoreLink') as HTMLAnchorElement;
      expect(link).toBeInTheDocument();
      expect(link.getAttribute('href')).toBe('snapshotAndRestoreUrl');
    });

    test('renders step as incomplete ', () => {
      expect(screen.getByTestId('backupStep-incomplete')).toBeInTheDocument();
    });
  });

  describe('On Cloud', () => {
    const setupCloudOverviewPage = async () =>
      setupOverviewPage(httpSetup, {
        plugins: {
          cloud: {
            isCloudEnabled: true,
            deploymentUrl: 'deploymentUrl',
          },
        },
      });

    describe('initial loading state', () => {
      beforeEach(async () => {
        // We don't want the request to load backup status to resolve immediately.
        setDelayResponse(true);
        await setupCloudOverviewPage();
      });

      test('is rendered', async () => {
        expect(await screen.findByTestId('cloudBackupLoading')).toBeInTheDocument();
      });
    });

    describe('error state', () => {
      test('is rendered', async () => {
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse(undefined, {
          statusCode: 400,
          message: 'error',
        });

        await setupCloudOverviewPage();

        expect(await screen.findByTestId('cloudBackupErrorCallout')).toBeInTheDocument();
      });

      test('lets the user attempt to reload backup status', async () => {
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse(undefined, {
          statusCode: 400,
          message: 'error',
        });

        await setupCloudOverviewPage();

        expect(await screen.findByTestId('cloudBackupRetryButton')).toBeInTheDocument();
      });

      test('loads on prem if missing found-snapshots repository', async () => {
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse(undefined, {
          statusCode: 404,
          message: `[${CLOUD_SNAPSHOT_REPOSITORY}] missing`,
        });

        await setupCloudOverviewPage();

        expect(await screen.findByTestId('snapshotRestoreLink')).toBeInTheDocument();
        expect(screen.queryByTestId('cloudBackupErrorCallout')).not.toBeInTheDocument();
      });
    });

    describe('success state', () => {
      describe('when data is backed up', () => {
        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadCloudBackupStatusResponse({
            isBackedUp: true,
            lastBackupTime: '2021-08-25T19:59:59.863Z',
          });

          await setupCloudOverviewPage();
        });

        test('renders link to Cloud backups and last backup time ', () => {
          expect(screen.getByTestId('dataBackedUpStatus')).toBeInTheDocument();
          expect(screen.getByTestId('cloudSnapshotsLink')).toBeInTheDocument();
          expect(screen.getByTestId('dataBackedUpStatus')).toHaveTextContent(
            'Last snapshot created on'
          );
        });

        test('renders step as complete ', async () => {
          expect(await screen.findByTestId('backupStep-complete')).toBeInTheDocument();
        });
      });

      describe(`when data isn't backed up`, () => {
        beforeEach(async () => {
          httpRequestsMockHelpers.setLoadCloudBackupStatusResponse({
            isBackedUp: false,
            lastBackupTime: undefined,
          });

          await setupCloudOverviewPage();
        });

        test('renders link to Cloud backups and "not backed up" status', () => {
          expect(screen.getByTestId('dataNotBackedUpStatus')).toBeInTheDocument();
          expect(screen.getByTestId('cloudSnapshotsLink')).toBeInTheDocument();
        });

        test('renders step as incomplete ', () => {
          expect(screen.getByTestId('backupStep-incomplete')).toBeInTheDocument();
        });
      });
    });

    describe('poll for new status', () => {
      beforeEach(async () => {
        jest.useFakeTimers();

        // First request will succeed.
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse({
          isBackedUp: true,
          lastBackupTime: '2021-08-25T19:59:59.863Z',
        });

        await setupCloudOverviewPage();
      });

      afterEach(async () => {
        await act(async () => {
          await jest.runOnlyPendingTimersAsync();
        });
        jest.clearAllTimers();
        jest.useRealTimers();
      });

      test('renders step as incomplete when a success state is followed by an error state', async () => {
        expect(await screen.findByTestId('backupStep-complete')).toBeInTheDocument();

        // Second request will error.
        httpRequestsMockHelpers.setLoadCloudBackupStatusResponse(undefined, {
          statusCode: 400,
          message: 'error',
        });

        // Resolve the polling timeout.
        await advanceTime(CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS);
        await waitFor(() => {
          expect(screen.getByTestId('backupStep-incomplete')).toBeInTheDocument();
        });
      });
    });
  });
});
