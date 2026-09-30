/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { DataStreamsAction } from '../../../../../../common/types';
import { DataStreamMigrationStatus } from '../../../../../../common/types';
import type { MigrationStateContext } from './context';
import { DataStreamReindexResolutionCell } from './resolution_table_cell';
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

describe('DataStreamReindexResolutionCell', () => {
  beforeEach(() => {
    mockUseDataStreamMigrationContext.mockReset();
  });

  const makeDefaultMigrationContextMock = (): MigrationStateContext => ({
    loadDataStreamMetadata: vi.fn<(...args: []) => Promise<void>>(),
    initMigration: vi.fn<(...args: [resolutionType: 'reindex' | 'readonly']) => void>(),
    startReindex: vi.fn<(...args: []) => Promise<void>>(),
    cancelReindex: vi.fn<(...args: []) => Promise<void>>(),
    startReadonly: vi.fn<(...args: []) => Promise<void>>(),
    cancelReadonly: vi.fn<(...args: []) => Promise<void>>(),
    migrationState: {
      loadingState: LoadingState.Success,
      status: DataStreamMigrationStatus.notStarted,
      taskPercComplete: null,
      errorMessage: null,
      meta: null,
    },
  });

  it('recommends set to read-only by default', () => {
    mockUseDataStreamMigrationContext.mockReturnValue(makeDefaultMigrationContextMock());

    renderWithI18n(<DataStreamReindexResolutionCell correctiveAction={baseCorrectiveAction} />);

    expect(screen.getByText('Recommended: set to read-only')).toBeInTheDocument();
  });

  it('recommends reindex when read-only is excluded', () => {
    const correctiveAction: DataStreamsAction = {
      ...baseCorrectiveAction,
      metadata: {
        ...baseCorrectiveAction.metadata,
        excludedActions: ['readOnly'],
      },
    };

    mockUseDataStreamMigrationContext.mockReturnValue(makeDefaultMigrationContextMock());

    renderWithI18n(<DataStreamReindexResolutionCell correctiveAction={correctiveAction} />);

    expect(screen.getByText('Recommended: reindex')).toBeInTheDocument();
  });
});
