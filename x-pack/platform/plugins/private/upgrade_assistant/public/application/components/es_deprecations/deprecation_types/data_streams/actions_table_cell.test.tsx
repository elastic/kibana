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

import type { DataStreamsAction } from '../../../../../../common/types';
import { DataStreamMigrationStatus } from '../../../../../../common/types';
import type { MigrationStateContext } from './context';
import { DataStreamReindexActionsCell } from './actions_table_cell';
import { LoadingState } from '../../../types';

const mockUseDataStreamMigrationContext = vi.fn<(...args: []) => MigrationStateContext>();

vi.mock('./context', () => {
  const mocked = {
    useDataStreamMigrationContext: () => mockUseDataStreamMigrationContext(),
  };
  return { ...mocked, default: mocked };
});

const baseCorrectiveAction: DataStreamsAction = {
  type: 'dataStream',
  metadata: {
    totalBackingIndices: 2,
    indicesRequiringUpgradeCount: 1,
    indicesRequiringUpgrade: ['.ds-my-ds-000001'],
    ignoredIndicesRequiringUpgrade: [],
    ignoredIndicesRequiringUpgradeCount: 0,
    reindexRequired: true,
  },
};

const createContext = ({
  status,
  resolutionType,
}: {
  status: DataStreamMigrationStatus;
  resolutionType?: 'reindex' | 'readonly';
}): MigrationStateContext => ({
  loadDataStreamMetadata: vi.fn<(...args: []) => Promise<void>>(),
  initMigration: vi.fn<(...args: [resolutionType: 'reindex' | 'readonly']) => void>(),
  startReindex: vi.fn<(...args: []) => Promise<void>>(),
  cancelReindex: vi.fn<(...args: []) => Promise<void>>(),
  startReadonly: vi.fn<(...args: []) => Promise<void>>(),
  cancelReadonly: vi.fn<(...args: []) => Promise<void>>(),
  migrationState: {
    loadingState: LoadingState.Success,
    status,
    resolutionType,
    taskPercComplete: null,
    errorMessage: null,
    meta: null,
    hasRequiredPrivileges: true,
  },
});

describe('DataStreamReindexActionsCell', () => {
  const mockOpenFlyout = vi.fn<(...args: []) => void>();
  const mockOpenModal = vi.fn<(...args: []) => void>();

  beforeEach(() => {
    mockUseDataStreamMigrationContext.mockReset();
    mockOpenFlyout.mockClear();
    mockOpenModal.mockClear();
  });

  it('displays both read-only and reindex actions when both are valid', () => {
    mockUseDataStreamMigrationContext.mockReturnValue(
      createContext({
        status: DataStreamMigrationStatus.notStarted,
      })
    );

    renderWithI18n(
      <DataStreamReindexActionsCell
        correctiveAction={baseCorrectiveAction}
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
      />
    );

    expect(screen.getByTestId('deprecation-dataStream-reindex')).toBeInTheDocument();
    expect(screen.getByTestId('deprecation-dataStream-readonly')).toBeInTheDocument();
  });

  it('only displays reindex action if read-only is excluded', () => {
    const correctiveAction: DataStreamsAction = {
      ...baseCorrectiveAction,
      metadata: { ...baseCorrectiveAction.metadata, excludedActions: ['readOnly'] },
    };

    mockUseDataStreamMigrationContext.mockReturnValue(
      createContext({
        status: DataStreamMigrationStatus.notStarted,
      })
    );

    renderWithI18n(
      <DataStreamReindexActionsCell
        correctiveAction={correctiveAction}
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
      />
    );

    expect(screen.getByTestId('deprecation-dataStream-reindex')).toBeInTheDocument();
    expect(screen.queryByTestId('deprecation-dataStream-readonly')).toBeNull();
  });

  it('only displays read-only action if reindex is excluded', () => {
    const correctiveAction: DataStreamsAction = {
      ...baseCorrectiveAction,
      metadata: { ...baseCorrectiveAction.metadata, excludedActions: ['reindex'] },
    };

    mockUseDataStreamMigrationContext.mockReturnValue(
      createContext({
        status: DataStreamMigrationStatus.notStarted,
      })
    );

    renderWithI18n(
      <DataStreamReindexActionsCell
        correctiveAction={correctiveAction}
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
      />
    );

    expect(screen.queryByTestId('deprecation-dataStream-reindex')).toBeNull();
    expect(screen.getByTestId('deprecation-dataStream-readonly')).toBeInTheDocument();
  });

  it('only displays reindex action when reindexing is in progress', () => {
    mockUseDataStreamMigrationContext.mockReturnValue(
      createContext({
        status: DataStreamMigrationStatus.inProgress,
        resolutionType: 'reindex',
      })
    );

    renderWithI18n(
      <DataStreamReindexActionsCell
        correctiveAction={baseCorrectiveAction}
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
      />
    );

    expect(screen.getByTestId('deprecation-dataStream-reindex')).toBeInTheDocument();
    expect(screen.queryByTestId('deprecation-dataStream-readonly')).toBeNull();
  });

  it('only displays read-only action when setting read-only is in progress', () => {
    mockUseDataStreamMigrationContext.mockReturnValue(
      createContext({
        status: DataStreamMigrationStatus.inProgress,
        resolutionType: 'readonly',
      })
    );

    renderWithI18n(
      <DataStreamReindexActionsCell
        correctiveAction={baseCorrectiveAction}
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
      />
    );

    expect(screen.queryByTestId('deprecation-dataStream-reindex')).toBeNull();
    expect(screen.getByTestId('deprecation-dataStream-readonly')).toBeInTheDocument();
  });

  it('calls open handlers on click', () => {
    mockUseDataStreamMigrationContext.mockReturnValue(
      createContext({
        status: DataStreamMigrationStatus.notStarted,
      })
    );

    renderWithI18n(
      <DataStreamReindexActionsCell
        correctiveAction={baseCorrectiveAction}
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
      />
    );

    fireEvent.click(screen.getByTestId('deprecation-dataStream-reindex'));
    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('deprecation-dataStream-readonly'));
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });
});
