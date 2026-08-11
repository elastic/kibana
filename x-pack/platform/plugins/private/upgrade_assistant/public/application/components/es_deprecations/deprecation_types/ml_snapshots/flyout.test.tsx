/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { ResponseError } from '../../../../../../common/types';
import {
  mockMlDeprecation,
  MOCK_JOB_ID,
  MOCK_SNAPSHOT_ID,
} from '../../__fixtures__/es_deprecations';
import type { SnapshotState } from './use_snapshot_state';
import { FixSnapshotsFlyout } from './flyout';

jest.mock('../../../../app_context', () => {
  const actual = jest.requireActual('../../../../app_context');

  return {
    ...actual,
    useAppContext: () => ({
      services: {
        core: {
          docLinks: {
            links: {
              ml: {
                setUpgradeMode: 'https://example.invalid/ml-upgrade-mode',
              },
            },
          },
        },
      },
    }),
  };
});

jest.mock('../../../../lib/ui_metric', () => {
  const actual = jest.requireActual('../../../../lib/ui_metric');

  return {
    ...actual,
    uiMetricService: {
      ...actual.uiMetricService,
      trackUiMetric: jest.fn(),
    },
  };
});

describe('FixSnapshotsFlyout', () => {
  const closeFlyout = jest.fn();
  const upgradeSnapshot = jest.fn();
  const deleteSnapshot = jest.fn();

  const renderFlyout = ({
    snapshotState,
    mlUpgradeModeEnabled,
  }: {
    snapshotState: SnapshotState;
    mlUpgradeModeEnabled: boolean;
  }) =>
    renderWithI18n(
      <FixSnapshotsFlyout
        deprecation={mockMlDeprecation}
        closeFlyout={closeFlyout}
        snapshotState={snapshotState}
        upgradeSnapshot={upgradeSnapshot}
        deleteSnapshot={deleteSnapshot}
        mlUpgradeModeEnabled={mlUpgradeModeEnabled}
      />
    );

  beforeEach(() => {
    closeFlyout.mockClear();
    upgradeSnapshot.mockClear();
    deleteSnapshot.mockClear();
  });

  it('renders flyout details and actions', () => {
    const snapshotState: SnapshotState = {
      jobId: MOCK_JOB_ID,
      snapshotId: MOCK_SNAPSHOT_ID,
      status: 'idle',
      error: undefined,
    };

    renderFlyout({ snapshotState, mlUpgradeModeEnabled: false });

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent('Upgrade or delete model snapshot');
    expect(screen.getByTestId('documentationLink')).toHaveAttribute('href', mockMlDeprecation.url);
    expect(screen.getByTestId('upgradeSnapshotButton')).toHaveTextContent('Upgrade');
    expect(screen.getByTestId('deleteSnapshotButton')).toHaveTextContent('Delete');
  });

  it('shows upgrade mode enabled callout and hides actions', () => {
    const snapshotState: SnapshotState = {
      jobId: MOCK_JOB_ID,
      snapshotId: MOCK_SNAPSHOT_ID,
      status: 'idle',
      error: undefined,
    };

    renderFlyout({ snapshotState, mlUpgradeModeEnabled: true });

    expect(screen.getByTestId('mlUpgradeModeEnabledError')).toBeInTheDocument();
    expect(screen.getByTestId('setUpgradeModeDocsLink')).toHaveAttribute(
      'href',
      'https://example.invalid/ml-upgrade-mode'
    );
    expect(screen.queryByTestId('upgradeSnapshotButton')).toBeNull();
    expect(screen.queryByTestId('deleteSnapshotButton')).toBeNull();
  });

  it('shows error callout and changes action labels on upgrade failure', () => {
    const error: ResponseError = {
      statusCode: 500,
      message: 'Upgrade snapshot error',
    };
    const snapshotState: SnapshotState = {
      jobId: MOCK_JOB_ID,
      snapshotId: MOCK_SNAPSHOT_ID,
      status: 'error',
      action: 'upgrade',
      error,
    };

    renderFlyout({ snapshotState, mlUpgradeModeEnabled: false });

    expect(screen.getByTestId('resolveSnapshotError')).toHaveTextContent(
      'Error upgrading snapshot'
    );
    expect(screen.getByTestId('resolveSnapshotError')).toHaveTextContent('Upgrade snapshot error');
    expect(screen.getByTestId('upgradeSnapshotButton')).toHaveTextContent('Retry upgrade');
  });

  it('shows error callout and changes action labels on delete failure', () => {
    const error: ResponseError = {
      statusCode: 500,
      message: 'Delete snapshot error',
    };
    const snapshotState: SnapshotState = {
      jobId: MOCK_JOB_ID,
      snapshotId: MOCK_SNAPSHOT_ID,
      status: 'error',
      action: 'delete',
      error,
    };

    renderFlyout({ snapshotState, mlUpgradeModeEnabled: false });

    expect(screen.getByTestId('resolveSnapshotError')).toHaveTextContent('Error deleting snapshot');
    expect(screen.getByTestId('resolveSnapshotError')).toHaveTextContent('Delete snapshot error');
    expect(screen.getByTestId('deleteSnapshotButton')).toHaveTextContent('Retry delete');
  });

  it('calls upgradeSnapshot and closes flyout', () => {
    const snapshotState: SnapshotState = {
      jobId: MOCK_JOB_ID,
      snapshotId: MOCK_SNAPSHOT_ID,
      status: 'idle',
      error: undefined,
    };

    renderFlyout({ snapshotState, mlUpgradeModeEnabled: false });

    fireEvent.click(screen.getByTestId('upgradeSnapshotButton'));
    expect(upgradeSnapshot).toHaveBeenCalled();
    expect(closeFlyout).toHaveBeenCalled();
  });

  it('calls deleteSnapshot and closes flyout', () => {
    const snapshotState: SnapshotState = {
      jobId: MOCK_JOB_ID,
      snapshotId: MOCK_SNAPSHOT_ID,
      status: 'idle',
      error: undefined,
    };

    renderFlyout({ snapshotState, mlUpgradeModeEnabled: false });

    fireEvent.click(screen.getByTestId('deleteSnapshotButton'));
    expect(deleteSnapshot).toHaveBeenCalled();
    expect(closeFlyout).toHaveBeenCalled();
  });
});
