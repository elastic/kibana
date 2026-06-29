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
import { ChangeHistoryProvider } from '../../provider/change_history_provider';
import type { ChangeHistoryAdapter } from '../../types/change_history_adapter';
import { TEST_OBJECT_ID, TEST_OBJECT_TITLE } from '../../test_utils/change_history_test_fixtures';
import { ChangeHistoryItem } from './change_history_item';

const adapter: ChangeHistoryAdapter = {
  listChanges: jest.fn(),
  getChange: jest.fn(),
};

const baseItem = {
  id: 'evt-1',
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Pavel M', profileId: 'user-1' },
  action: 'Updated',
  changeCount: 4,
  isCurrent: true,
  metadata: { version: 6 },
};

const renderItem = (
  overrides?: Partial<typeof baseItem>,
  providerProps?: Partial<React.ComponentProps<typeof ChangeHistoryProvider>>
) =>
  render(
    <I18nProvider>
      <ChangeHistoryProvider
        objectId={TEST_OBJECT_ID}
        adapter={adapter}
        labels={{ previewTitle: TEST_OBJECT_TITLE }}
        renderPreview={() => null}
        renderBadge={({ item }) => (
          <EuiBadge color="hollow">
            {item.isCurrent
              ? `Current version • v${item.metadata?.version}`
              : `v${item.metadata?.version}`}
          </EuiBadge>
        )}
        {...providerProps}
      >
        <ChangeHistoryItem
          item={{ ...baseItem, ...overrides }}
          selected={false}
          onClick={jest.fn()}
        />
      </ChangeHistoryProvider>
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
        <ChangeHistoryProvider
          objectId={TEST_OBJECT_ID}
          adapter={adapter}
          labels={{ previewTitle: TEST_OBJECT_TITLE }}
          renderPreview={() => null}
          renderBadge={({ item }) => (
            <EuiBadge color="hollow">v{String(item.metadata?.version ?? '')}</EuiBadge>
          )}
        >
          <ChangeHistoryItem item={baseItem} selected={true} onClick={jest.fn()} />
        </ChangeHistoryProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('changeHistoryItem-evt-1')).toHaveAttribute('data-selected', 'true');
  });
});
