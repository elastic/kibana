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
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';

import type {
  EnrichedDeprecationInfo,
  ReindexAction,
  UnfreezeAction,
} from '../../../../../../common/types';
import type { IndexStateContext } from './context';
import { ReindexActionCell } from './actions_table_cell';
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

describe('ReindexActionCell', () => {
  const mockOpenFlyout = jest.fn<void, []>();
  const mockOpenModal = jest.fn<void, []>();
  const mockSetSelectedResolutionType = jest.fn<void, [step: string]>();

  beforeEach(() => {
    mockUseIndexContext.mockReset();
    mockOpenFlyout.mockClear();
    mockOpenModal.mockClear();
    mockSetSelectedResolutionType.mockClear();
  });

  it('displays reindex and unfreeze actions for frozen indices', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: unfreezeDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.getByTestId('deprecation-unfreeze-reindex')).toBeInTheDocument();
    expect(screen.getByTestId('deprecation-unfreeze-unfreeze')).toBeInTheDocument();
  });

  it('only displays reindex action if reindex is in progress (frozen indices)', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: unfreezeDeprecation,
        reindexState: createReindexState({ status: ReindexStatus.inProgress }),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.getByTestId('deprecation-unfreeze-reindex')).toBeInTheDocument();
    expect(screen.queryByTestId('deprecation-unfreeze-unfreeze')).toBeNull();
  });

  it('only displays unfreeze action if unfreezing is in progress (frozen indices)', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: unfreezeDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState({ status: 'inProgress' }),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.queryByTestId('deprecation-unfreeze-reindex')).toBeNull();
    expect(screen.getByTestId('deprecation-unfreeze-unfreeze')).toBeInTheDocument();
  });

  it('displays reindex and read-only actions when both are valid', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.getByTestId('deprecation-reindex-reindex')).toBeInTheDocument();
    expect(screen.getByTestId('deprecation-reindex-readonly')).toBeInTheDocument();
  });

  it('only displays read-only action if reindexing is excluded', () => {
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

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.queryByTestId('deprecation-reindex-reindex')).toBeNull();
    expect(screen.getByTestId('deprecation-reindex-readonly')).toBeInTheDocument();
  });

  it('only displays read-only action if index is a follower index', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState({
          meta: { ...createReindexState().meta, isFollowerIndex: true },
        }),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.queryByTestId('deprecation-reindex-reindex')).toBeNull();
    expect(screen.getByTestId('deprecation-reindex-readonly')).toBeInTheDocument();
  });

  it('only displays reindex action if read-only is excluded', () => {
    const excludedReadOnlyDeprecation: EnrichedDeprecationInfo = {
      ...reindexDeprecation,
      correctiveAction: {
        ...(reindexDeprecation.correctiveAction as ReindexAction),
        excludedActions: ['readOnly'],
      },
    };

    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: excludedReadOnlyDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.getByTestId('deprecation-reindex-reindex')).toBeInTheDocument();
    expect(screen.queryByTestId('deprecation-reindex-readonly')).toBeNull();
  });

  it('only displays read-only action when readonly update is in progress', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState({ status: 'inProgress' }),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    expect(screen.queryByTestId('deprecation-reindex-reindex')).toBeNull();
    expect(screen.getByTestId('deprecation-reindex-readonly')).toBeInTheDocument();
  });

  it('calls open handlers and sets resolution type on click', () => {
    mockUseIndexContext.mockReturnValue(
      createIndexContext({
        deprecation: reindexDeprecation,
        reindexState: createReindexState(),
        updateIndexState: createUpdateIndexState(),
      })
    );

    renderWithI18n(
      <ReindexActionCell
        openFlyout={mockOpenFlyout}
        openModal={mockOpenModal}
        setSelectedResolutionType={mockSetSelectedResolutionType}
      />
    );

    fireEvent.click(screen.getByTestId('deprecation-reindex-reindex'));
    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('deprecation-reindex-readonly'));
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
    expect(mockSetSelectedResolutionType).toHaveBeenCalledWith('readonly');
  });
});
