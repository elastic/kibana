/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
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
  changeCount: 4,
  isCurrent: true,
  metadata: { version: 6 },
};

const renderItem = (
  overrides?: Partial<ChangeHistoryListItem>,
  options?: { selected?: boolean; onClick?: jest.Mock }
) =>
  render(
    <I18nProvider>
      <ChangeHistoryItem
        item={{ ...baseItem, ...overrides }}
        selected={options?.selected ?? false}
        onClick={options?.onClick ?? jest.fn()}
      />
    </I18nProvider>
  );

describe('ChangeHistoryItem', () => {
  beforeEach(() => {
    mockUseChangeHistoryConfig.mockReturnValue({
      renderBadge: ({ item }: { item: ChangeHistoryListItem }) => (
        <EuiBadge color="hollow">
          {item.isCurrent
            ? `Current version • v${item.metadata?.version}`
            : `v${item.metadata?.version}`}
        </EuiBadge>
      ),
    });
  });

  it('renders relative timestamp, actor metadata, and version badge', () => {
    renderItem();

    expect(screen.getByTestId('changeHistoryItem-evt-1')).toBeInTheDocument();
    expect(screen.getByText('Pavel M • 4 changes')).toBeInTheDocument();
    expect(screen.getByText('Current version • v6')).toBeInTheDocument();
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
});
