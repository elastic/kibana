/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuPanel, EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import React from 'react';
import {
  useAutomationRowMenuItems,
  type UseAutomationRowMenuItemsParams,
} from './use_automation_row_menu_items';

const createDefaultParams = (
  overrides: Partial<UseAutomationRowMenuItemsParams> = {}
): UseAutomationRowMenuItemsParams => ({
  editHref: '/app/workflows/wf-1',
  isReadOnly: false,
  isBusy: false,
  canRun: true,
  isRunDisabled: false,
  onCloseMenu: jest.fn(),
  onRun: jest.fn(),
  onPreview: jest.fn(),
  onDelete: jest.fn(),
  ...overrides,
});

const renderMenu = (overrides: Partial<UseAutomationRowMenuItemsParams> = {}) => {
  const params = createDefaultParams(overrides);
  const { result } = renderHook(() => useAutomationRowMenuItems(params));
  render(
    <I18nProvider>
      <EuiProvider>
        <EuiContextMenuPanel items={result.current} />
      </EuiProvider>
    </I18nProvider>
  );
  return params;
};

describe('useAutomationRowMenuItems', () => {
  it('includes an enabled Run item when canRun is true and isRunDisabled is false', () => {
    renderMenu({ canRun: true, isRunDisabled: false });

    const runItem = screen.getByTestId('contextRunAutomationButton');
    expect(runItem).toBeInTheDocument();
    expect(runItem).toHaveTextContent('Run');
    expect(runItem).not.toBeDisabled();
  });

  it('omits the Run item when canRun is false', () => {
    renderMenu({ canRun: false });

    expect(screen.queryByTestId('contextRunAutomationButton')).not.toBeInTheDocument();
  });

  it('disables the Run item when isRunDisabled is true', () => {
    renderMenu({ canRun: true, isRunDisabled: true });

    expect(screen.getByTestId('contextRunAutomationButton')).toBeDisabled();
  });

  it('closes the menu and invokes onRun when Run is clicked', () => {
    const params = renderMenu();

    fireEvent.click(screen.getByTestId('contextRunAutomationButton'));

    expect(params.onCloseMenu).toHaveBeenCalledTimes(1);
    expect(params.onRun).toHaveBeenCalledTimes(1);
  });
});
