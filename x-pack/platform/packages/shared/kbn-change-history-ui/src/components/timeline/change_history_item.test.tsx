/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { ChangeHistoryItem } from './change_history_item';

const baseItem = {
  id: 'evt-1',
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Pavel M', profileId: 'user-1' },
  action: 'Updated',
  changeCount: 4,
  isCurrent: true,
  metadata: { version: 6 },
};

const renderItem = (overrides?: Partial<typeof baseItem>) =>
  render(
    <I18nProvider>
      <ChangeHistoryItem
        item={{ ...baseItem, ...overrides }}
        selected={false}
        onClick={jest.fn()}
        renderBadge={({ item }) => (
          <EuiBadge color="hollow">
            {item.isCurrent
              ? `Current version • v${item.metadata?.version}`
              : `v${item.metadata?.version}`}
          </EuiBadge>
        )}
      />
    </I18nProvider>
  );

describe('ChangeHistoryItem', () => {
  it('renders relative timestamp, actor metadata, and version badge', () => {
    renderItem();

    expect(screen.getByTestId('changeHistoryItem-evt-1')).toBeInTheDocument();
    expect(screen.getByText('Pavel M • 4 changes')).toBeInTheDocument();
    expect(screen.getByText('Current version • v6')).toBeInTheDocument();
  });

  it('marks the item as selected for styling', () => {
    render(
      <I18nProvider>
        <ChangeHistoryItem
          item={baseItem}
          selected={true}
          onClick={jest.fn()}
          renderBadge={({ item }) => (
            <EuiBadge color="hollow">v{String(item.metadata?.version ?? '')}</EuiBadge>
          )}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('changeHistoryItem-evt-1')).toHaveAttribute('data-selected', 'true');
  });
});
