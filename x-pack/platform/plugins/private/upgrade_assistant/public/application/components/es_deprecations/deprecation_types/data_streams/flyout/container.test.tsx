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

import type { EnrichedDeprecationInfo } from '../../../../../../../common/types';
import { DataStreamMigrationStatus } from '../../../../../../../common/types';
import { LoadingState } from '../../../../types';
import type { MigrationState } from '../use_migration_state';
import { DataStreamReindexFlyout } from './container';

jest.mock('../../../../../app_context', () => {
  const actual = jest.requireActual('../../../../../app_context');

  return {
    ...actual,
    useAppContext: () => ({
      services: {
        api: {
          useLoadNodeDiskSpace: () => ({ data: [] }),
        },
        core: {
          docLinks: {
            links: { upgradeAssistant: { dataStreamReindex: 'https://example.invalid' } },
          },
        },
      },
    }),
  };
});

jest.mock('../use_migration_step', () => ({
  useMigrationStep: () => ['confirm', jest.fn()] as const,
}));

jest.mock('./steps/confirm', () => ({
  ConfirmMigrationReindexFlyoutStep: ({
    lastIndexCreationDateFormatted,
  }: {
    lastIndexCreationDateFormatted: string;
  }) => <div data-test-subj="confirmMigrationStep">{lastIndexCreationDateFormatted}</div>,
  ConfirmMigrationReadonlyFlyoutStep: () => <div data-test-subj="confirmReadonlyStep" />,
}));

jest.mock('./steps/checklist', () => ({
  ChecklistFlyoutStep: () => <div data-test-subj="checklistStep" />,
}));

jest.mock('./steps/completed', () => ({
  MigrationCompletedFlyoutStep: () => <div data-test-subj="completedStep" />,
}));

jest.mock('../../../common/initializing_step', () => ({
  InitializingStep: () => <div data-test-subj="initializingStep" />,
}));

const mockDeprecation: EnrichedDeprecationInfo = {
  type: 'data_streams',
  level: 'warning',
  resolveDuringUpgrade: false,
  url: 'doc_url',
  message: 'Data stream needs to be reindexed or set to read-only',
  index: 'my-data-stream',
  correctiveAction: {
    type: 'dataStream',
    metadata: {
      totalBackingIndices: 2,
      indicesRequiringUpgradeCount: 1,
      indicesRequiringUpgrade: ['.ds-my-data-stream-000001'],
      ignoredIndicesRequiringUpgrade: [],
      ignoredIndicesRequiringUpgradeCount: 0,
      reindexRequired: true,
    },
  },
};

const createMigrationState = (): MigrationState => ({
  loadingState: LoadingState.Success,
  status: DataStreamMigrationStatus.notStarted,
  taskPercComplete: null,
  errorMessage: null,
  resolutionType: 'reindex',
  meta: {
    dataStreamName: 'my-data-stream',
    documentationUrl: 'https://example.invalid/docs',
    lastIndexRequiringUpgradeCreationDate: 1700000000000,
    indicesRequiringUpgradeCount: 1,
    indicesRequiringUpgrade: ['.ds-my-data-stream-000001'],
    allIndices: ['.ds-my-data-stream-000001', '.ds-my-data-stream-000002'],
    allIndicesCount: 2,
    indicesRequiringUpgradeDocsCount: 10,
    indicesRequiringUpgradeDocsSize: 1024,
  },
});

describe('DataStreamReindexFlyout', () => {
  it('renders formatted metadata in the flyout header', () => {
    const migrationState = createMigrationState();

    renderWithI18n(
      <DataStreamReindexFlyout
        deprecation={mockDeprecation}
        closeFlyout={jest.fn()}
        loadDataStreamMetadata={jest.fn<Promise<void>, []>()}
        migrationState={migrationState}
        initMigration={jest.fn<void, [resolutionType: 'reindex' | 'readonly']>()}
        startReindex={jest.fn<Promise<void>, []>()}
        cancelReindex={jest.fn<Promise<void>, []>()}
        startReadonly={jest.fn<Promise<void>, []>()}
        cancelReadonly={jest.fn<Promise<void>, []>()}
      />
    );

    expect(screen.getByTestId('flyoutTitle')).toHaveTextContent('my-data-stream');
    const lastIndexCreationDateFormatted = screen.getByTestId('confirmMigrationStep').textContent;
    expect(lastIndexCreationDateFormatted).not.toBeNull();
    expect(screen.getByTestId('dataStreamLastIndexCreationDate')).toHaveTextContent(
      lastIndexCreationDateFormatted!
    );
    expect(screen.getByTestId('dataStreamSize')).toHaveTextContent(/1\s?KB/);
    expect(screen.getByTestId('dataStreamDocumentCount')).toHaveTextContent('10');
    expect(screen.getByTestId('confirmMigrationStep')).toHaveTextContent(/\b20\d{2}\b/);
  });
});
