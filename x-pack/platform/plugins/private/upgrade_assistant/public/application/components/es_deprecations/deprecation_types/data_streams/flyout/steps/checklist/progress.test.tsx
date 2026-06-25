/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { DataStreamProgressDetails } from '../../../../../../../../../common/types';
import { DataStreamMigrationStatus } from '../../../../../../../../../common/types';
import { LoadingState } from '../../../../../../types';
import type { MigrationState } from '../../../use_migration_state';
import { MigrationProgress } from './progress';

jest.mock('./progress_title', () => ({
  MigrateDocumentsStepTitle: () => <span data-test-subj="migrateDocumentsTitle" />,
}));

describe('MigrationProgress', () => {
  it('renders the per-status counts for reindex resolution type', () => {
    const taskStatus: DataStreamProgressDetails = {
      startTimeMs: 1700000000000,
      successCount: 2,
      errorsCount: 1,
      inProgressCount: 3,
      pendingCount: 4,
    };

    const migrationState: MigrationState = {
      loadingState: LoadingState.Success,
      status: DataStreamMigrationStatus.inProgress,
      taskPercComplete: 50,
      errorMessage: null,
      resolutionType: 'reindex',
      meta: null,
      taskStatus,
    };

    renderWithI18n(<MigrationProgress migrationState={migrationState} dataStreamName="logs-foo" />);

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent('logs-foo');
    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
      'Reindexing logs-foo in progress…'
    );
    expect(screen.getByText('1 Index failed to get reindexed.')).toBeInTheDocument();
    expect(screen.getByText('2 Indices successfully reindexed.')).toBeInTheDocument();
    expect(screen.getByText('3 Indices currently getting reindexed.')).toBeInTheDocument();
    expect(screen.getByText('4 Indices waiting to start.')).toBeInTheDocument();
  });

  it('renders the per-status counts for readonly resolution type', () => {
    const taskStatus: DataStreamProgressDetails = {
      startTimeMs: 1700000000000,
      successCount: 1,
      errorsCount: 0,
      inProgressCount: 0,
      pendingCount: 1,
    };

    const migrationState: MigrationState = {
      loadingState: LoadingState.Success,
      status: DataStreamMigrationStatus.inProgress,
      taskPercComplete: 20,
      errorMessage: null,
      resolutionType: 'readonly',
      meta: null,
      taskStatus,
    };

    renderWithI18n(<MigrationProgress migrationState={migrationState} dataStreamName="logs-bar" />);

    expect(screen.getByTestId('reindexChecklistTitle')).toHaveTextContent(
      'Setting to read-only logs-bar in progress…'
    );
    expect(screen.getByText('1 Index successfully set to read-only.')).toBeInTheDocument();
    expect(screen.getByText('0 Indices currently getting set to read-only.')).toBeInTheDocument();
    expect(screen.getByText('1 Index waiting to start.')).toBeInTheDocument();
  });
});
