/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import { TestProvider } from '../../test_utils/test_providers';
import { renderDefaultChangeHistoryRowActions } from './change_history_row_actions';

const historicalItem: ChangeHistoryListItem = {
  id: 'evt-2',
  timestamp: '2026-06-15T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  metadata: { version: 3 },
};

describe('renderDefaultChangeHistoryRowActions', () => {
  it('invokes compare and restore callbacks from the menu', () => {
    const requestCompareToVersion = jest.fn();
    const requestRestoreVersion = jest.fn();

    render(
      renderDefaultChangeHistoryRowActions({
        item: historicalItem,
        requestCompareToVersion,
        requestRestoreVersion,
      }),
      { wrapper: TestProvider }
    );

    fireEvent.click(screen.getByTestId('changeHistoryRowActionsButton'));
    fireEvent.click(screen.getByTestId('changeHistoryCompareToThisVersion'));
    expect(requestCompareToVersion).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('changeHistoryRowActionsButton'));
    fireEvent.click(screen.getByTestId('changeHistoryRestoreThisVersion'));
    expect(requestRestoreVersion).toHaveBeenCalledTimes(1);
  });

  it('omits restore when restore callback is not provided', () => {
    render(
      renderDefaultChangeHistoryRowActions({
        item: historicalItem,
        requestCompareToVersion: jest.fn(),
      }),
      { wrapper: TestProvider }
    );

    fireEvent.click(screen.getByTestId('changeHistoryRowActionsButton'));

    expect(screen.getByTestId('changeHistoryCompareToThisVersion')).toBeInTheDocument();
    expect(screen.queryByTestId('changeHistoryRestoreThisVersion')).not.toBeInTheDocument();
  });

  it('omits compare when compare callback is not provided', () => {
    const requestRestoreVersion = jest.fn();

    render(
      renderDefaultChangeHistoryRowActions({
        item: historicalItem,
        requestRestoreVersion,
      }),
      { wrapper: TestProvider }
    );

    fireEvent.click(screen.getByTestId('changeHistoryRowActionsButton'));

    expect(screen.queryByTestId('changeHistoryCompareToThisVersion')).not.toBeInTheDocument();
    expect(screen.getByTestId('changeHistoryRestoreThisVersion')).toBeInTheDocument();
  });
});
