/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import { ChangeHistoryModalSelectionContext } from '../../provider/change_history_modal_selection_context';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import type { ChangeHistoryChangesSummaryRenderFn } from '../../types/change_history_changes_summary';
import { TestProvider } from '../../test_utils/test_providers';
import { ChangeHistoryItem } from './change_history_item';

jest.mock('../../provider/use_change_history_config', () => ({
  useChangeHistoryConfig: jest.fn(),
}));

const mockUseChangeHistoryConfig = useChangeHistoryConfig as jest.Mock;

const baseItem: ChangeHistoryListItem = {
  id: 'evt-1',
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Pavel M', profileId: 'user-1' },
  action: 'Updated',
  changes: {
    count: 4,
    summary: [{ title: 'Section A:', lines: ['2 added', '1 removed', '1 updated'] }],
  },
  isCurrent: true,
  metadata: { version: 6 },
};

const renderItem = (
  overrides?: Partial<ChangeHistoryListItem>,
  options?: {
    selected?: boolean;
    onClick?: jest.Mock;
    modalSelection?: {
      requestCompareToVersion?: jest.Mock;
      requestRestoreVersion?: jest.Mock;
    };
  }
) =>
  render(
    <ChangeHistoryModalSelectionContext.Provider
      value={
        options?.modalSelection ?? {
          requestCompareToVersion: jest.fn(),
          requestRestoreVersion: jest.fn(),
        }
      }
    >
      <ChangeHistoryItem
        item={{ ...baseItem, ...overrides }}
        selected={options?.selected ?? false}
        onClick={options?.onClick ?? jest.fn()}
      />
    </ChangeHistoryModalSelectionContext.Provider>,
    { wrapper: TestProvider }
  );

describe('ChangeHistoryItem', () => {
  beforeEach(() => {
    mockUseChangeHistoryConfig.mockReturnValue({
      supports: { compare: true, restore: false, unsavedChanges: false },
      renderBadge: ({ item }: { item: ChangeHistoryListItem }) => (
        <EuiBadge color="hollow">
          {item.isCurrent
            ? `Current version • v${item.metadata?.version}`
            : `v${item.metadata?.version}`}
        </EuiBadge>
      ),
      renderChangesSummary: (({ summary }) => (
        <span data-test-subj="changeHistoryItemChangesSummary">{JSON.stringify(summary)}</span>
      )) satisfies ChangeHistoryChangesSummaryRenderFn,
    });
  });

  it('renders relative timestamp, actor metadata, and version badge', () => {
    renderItem();

    expect(screen.getByTestId('changeHistoryItem-evt-1')).toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryItemChanges')).toHaveTextContent('4 changes');
    expect(screen.getByText('Pavel M •')).toBeInTheDocument();
    expect(screen.getByText('Current version • v6')).toBeInTheDocument();
  });

  it('renders changes without summary when summary is omitted', () => {
    renderItem({ changes: { count: 2 } });

    expect(screen.getByTestId('changeHistoryItemChanges')).toHaveTextContent('2 changes');
  });

  it('renders changes without tooltip when renderChangesSummary is omitted', () => {
    mockUseChangeHistoryConfig.mockReturnValue({
      supports: { compare: true, restore: false, unsavedChanges: false },
      renderBadge: ({ item }: { item: ChangeHistoryListItem }) => (
        <EuiBadge color="hollow">v{String(item.metadata?.version ?? '')}</EuiBadge>
      ),
    });

    renderItem();

    expect(screen.getByTestId('changeHistoryItemChanges')).toHaveTextContent('4 changes');
    expect(screen.queryByTestId('changeHistoryItemChangesSummary')).not.toBeInTheDocument();
  });

  it('marks the item as selected for styling', () => {
    renderItem(undefined, { selected: true });

    expect(screen.getByTestId('changeHistoryItem-evt-1')).toHaveAttribute('data-selected', 'true');
  });

  it('selects the item when a non-expandable comment is clicked', () => {
    const onClick = jest.fn();
    renderItem({ comment: 'Restored from backup' }, { onClick });

    fireEvent.click(screen.getByTestId('changeHistoryItemComment'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders default row actions for non-current versions', () => {
    renderItem({ id: 'evt-2', isCurrent: false, metadata: { version: 5 } });

    expect(screen.getByTestId('changeHistoryRowActionsButton')).toBeInTheDocument();
  });

  it('does not render row actions for the current version', () => {
    renderItem({ isCurrent: true });

    expect(screen.queryByTestId('changeHistoryRowActionsButton')).not.toBeInTheDocument();
  });

  it('calls compare from default row actions', () => {
    const requestCompareToVersion = jest.fn();
    renderItem(
      { id: 'evt-2', isCurrent: false, metadata: { version: 5 } },
      { modalSelection: { requestCompareToVersion } }
    );

    fireEvent.click(screen.getByTestId('changeHistoryRowActionsButton'));
    fireEvent.click(screen.getByTestId('changeHistoryCompareToThisVersion'));

    expect(requestCompareToVersion).toHaveBeenCalledWith('evt-2');
  });

  it('omits compare row action when supports.compare is false', () => {
    mockUseChangeHistoryConfig.mockReturnValue({
      supports: { compare: false, restore: true, unsavedChanges: false },
      renderBadge: ({ item }: { item: ChangeHistoryListItem }) => (
        <EuiBadge color="hollow">v{String(item.metadata?.version ?? '')}</EuiBadge>
      ),
    });

    const requestRestoreVersion = jest.fn();
    renderItem(
      { id: 'evt-2', isCurrent: false, metadata: { version: 5 } },
      { modalSelection: { requestRestoreVersion } }
    );

    fireEvent.click(screen.getByTestId('changeHistoryRowActionsButton'));

    expect(screen.queryByTestId('changeHistoryCompareToThisVersion')).not.toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryRestoreThisVersion')).toBeInTheDocument();
  });
});
