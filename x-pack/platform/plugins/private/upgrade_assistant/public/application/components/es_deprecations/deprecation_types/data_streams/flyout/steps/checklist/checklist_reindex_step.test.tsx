/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { DataStreamMigrationStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { MigrationState } from '../../../use_migration_state';
import { ChecklistFlyoutStep } from './checklist_reindex_step';

vi.mock('../../../../../../../app_context', async () => {
  const actual = await vi.importActual('../../../../../../../app_context');

  return {
    ...actual,
    useAppContext: () => ({
      services: {
        api: {
          useLoadNodeDiskSpace: () => ({ data: [] }),
        },
      },
    }),
  };
});

vi.mock('../../../../../common/nodes_low_disk_space', () => {
  const mocked = {
    NodesLowSpaceCallOut: () => <div data-test-subj="nodesLowSpaceCallout" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./callouts', () => {
  const mocked = {
    FetchFailedCallout: ({ hasFetchFailed }: { hasFetchFailed: boolean }) => (
      <div data-test-subj="fetchFailedCallout">{String(hasFetchFailed)}</div>
    ),
    NoPrivilegesCallout: () => <div data-test-subj="noPrivilegesCallout" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./progress', () => {
  const mocked = {
    MigrationProgress: () => <div data-test-subj="migrationProgress" />,
  };
  return { ...mocked, default: mocked };
});

const createMigrationState = (overrides: Partial<MigrationState>): MigrationState => ({
  loadingState: LoadingState.Success,
  status: DataStreamMigrationStatus.notStarted,
  taskPercComplete: null,
  errorMessage: null,
  meta: null,
  hasRequiredPrivileges: true,
  resolutionType: 'reindex',
  taskStatus: undefined,
  cancelLoadingState: undefined,
  migrationWarnings: undefined,
  ...overrides,
});

const renderChecklistFlyout = ({
  migrationState,
  executeAction = vi.fn(),
  cancelAction = vi.fn(),
  dataStreamName = 'my-ds',
}: {
  migrationState: MigrationState;
  executeAction?: () => void;
  cancelAction?: () => void;
  dataStreamName?: string;
}) => {
  renderWithI18n(
    <ChecklistFlyoutStep
      closeFlyout={vi.fn()}
      migrationState={migrationState}
      executeAction={executeAction}
      cancelAction={cancelAction}
      dataStreamName={dataStreamName}
    />
  );
};

describe('ChecklistFlyoutStep (data streams)', () => {
  it('renders fetch-failed callout and hides main action button on fetchFailed', () => {
    renderChecklistFlyout({
      migrationState: createMigrationState({
        status: DataStreamMigrationStatus.fetchFailed,
        errorMessage: 'fetch failed',
      }),
    });

    expect(screen.getByTestId('dataStreamMigrationChecklistFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('fetchFailedCallout')).toHaveTextContent('true');
    expect(screen.queryByTestId('startDataStreamMigrationButton')).toBeNull();
  });

  it('shows try-again button on failed status', () => {
    renderChecklistFlyout({
      migrationState: createMigrationState({
        status: DataStreamMigrationStatus.failed,
        errorMessage: 'failed',
      }),
    });

    expect(screen.getByTestId('fetchFailedCallout')).toHaveTextContent('false');
    expect(screen.getByTestId('startDataStreamMigrationButton')).toHaveTextContent('Try again');
  });

  it('shows cancel button when migration is in progress', () => {
    const cancelAction = vi.fn();

    renderChecklistFlyout({
      migrationState: createMigrationState({
        status: DataStreamMigrationStatus.inProgress,
      }),
      cancelAction,
    });

    expect(screen.getByTestId('startDataStreamMigrationButton')).toBeDisabled();
    fireEvent.click(screen.getByTestId('cancelDataStreamMigrationButton'));
    expect(cancelAction).toHaveBeenCalledTimes(1);
  });
});
