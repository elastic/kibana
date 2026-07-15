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
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';

import type {
  EnrichedDeprecationInfo,
  ReindexAction,
  UnfreezeAction,
} from '../../../../../../common/types';
import type { IndexStateContext } from './context';
import { ReindexResolutionCell } from './resolution_table_cell';
import {
  createIndexContext,
  createReindexState,
  createUpdateIndexState,
} from '../test_utils/helpers';

const mockUseIndexContext = jest.fn<IndexStateContext, []>();

jest.mock('./context', () => ({
  useIndexContext: () => mockUseIndexContext(),
}));

const baseDeprecation = {
  level: 'critical',
  resolveDuringUpgrade: false,
  type: 'index_settings',
  message: 'Index created before 7.0',
  details: 'deprecation details',
  url: 'doc_url',
  index: 'test-index',
} satisfies Omit<EnrichedDeprecationInfo, 'correctiveAction'>;

const reindexDeprecation = {
  ...baseDeprecation,
  correctiveAction: {
    type: 'reindex',
    metadata: {
      isClosedIndex: false,
      isFrozenIndex: false,
      isInDataStream: false,
    },
  } satisfies ReindexAction,
} satisfies EnrichedDeprecationInfo;

const unfreezeDeprecation = {
  ...baseDeprecation,
  correctiveAction: {
    type: 'unfreeze',
    metadata: {
      isClosedIndex: false,
      isFrozenIndex: true,
      isInDataStream: false,
    },
  } satisfies UnfreezeAction,
} satisfies EnrichedDeprecationInfo;

describe('ReindexResolutionCell', () => {
  beforeEach(() => {
    mockUseIndexContext.mockReset();
  });

  it('recommends reindexing by default', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={reindexDeprecation} />);

    expect(screen.getByText('Recommended: reindex')).toBeInTheDocument();
  });

  it('recommends unfreeze for frozen indices', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: unfreezeDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={unfreezeDeprecation} />);

    expect(screen.getByText('Recommended: unfreeze')).toBeInTheDocument();
  });

  it('recommends set to read-only for follower indices', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState({
          meta: { ...createReindexState().meta, isFollowerIndex: true },
        }),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={reindexDeprecation} />);

    expect(screen.getByText('Recommended: set to read-only')).toBeInTheDocument();
  });

  it('recommends set to read-only for large indices', () => {
    const largeIndexDeprecation: EnrichedDeprecationInfo = {
      ...reindexDeprecation,
      correctiveAction: {
        ...(reindexDeprecation.correctiveAction as ReindexAction),
        indexSizeInBytes: 1073741825,
      },
    };

    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: largeIndexDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={largeIndexDeprecation} />);

    expect(screen.getByText('Recommended: set to read-only')).toBeInTheDocument();
  });

  it('recommends reindexing if index is already read-only', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState({
          meta: { ...createReindexState().meta, isReadonly: true },
        }),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={reindexDeprecation} />);

    expect(screen.getByText('Recommended: reindex')).toBeInTheDocument();
  });

  it('recommends set to read-only if reindexing is excluded', () => {
    const excludedReindexDeprecation: EnrichedDeprecationInfo = {
      ...reindexDeprecation,
      correctiveAction: {
        ...(reindexDeprecation.correctiveAction as ReindexAction),
        excludedActions: ['reindex'],
      },
    };

    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: excludedReindexDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={excludedReindexDeprecation} />);

    expect(screen.getByText('Recommended: set to read-only')).toBeInTheDocument();
  });

  it('recommends manual fix if follower index is already read-only', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState({
          meta: { ...createReindexState().meta, isFollowerIndex: true, isReadonly: true },
        }),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={reindexDeprecation} />);

    expect(screen.getByText('Resolve manually')).toBeInTheDocument();
  });

  it('shows success state when readonly update completed after reindex failure', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState({ status: ReindexStatus.failed }),
        updateIndexState: createUpdateIndexState({ status: 'complete' }),
      })
    );

    renderWithI18n(<ReindexResolutionCell deprecation={reindexDeprecation} />);

    expect(screen.getByText('Index is set to read-only')).toBeInTheDocument();
  });
});
