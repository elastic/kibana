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
  onCloseMenu: jest.fn(),
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
  it('offers View, Open in Workflows and Delete; Run is a row button', () => {
    renderMenu();

    expect(screen.getByTestId('contextPreviewWorkflowButton')).toBeInTheDocument();
    expect(screen.getByTestId('contextOpenWorkflowButton')).toHaveAttribute(
      'href',
      '/app/workflows/wf-1'
    );
    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeInTheDocument();
    expect(screen.queryByTestId('contextRunAutomationButton')).not.toBeInTheDocument();
  });

  it('only offers View on a read-only AI index', () => {
    renderMenu({ isReadOnly: true });

    expect(screen.getByTestId('contextPreviewWorkflowButton')).toBeInTheDocument();
    expect(screen.queryByTestId('contextOpenWorkflowButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextRemoveAutomationButton')).not.toBeInTheDocument();
  });

  it('closes the menu before opening the preview or the delete confirmation', () => {
    const params = renderMenu();

    fireEvent.click(screen.getByTestId('contextPreviewWorkflowButton'));
    fireEvent.click(screen.getByTestId('contextRemoveAutomationButton'));

    expect(params.onCloseMenu).toHaveBeenCalledTimes(2);
    expect(params.onPreview).toHaveBeenCalledTimes(1);
    expect(params.onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables Delete while the AI index is being saved', () => {
    renderMenu({ isBusy: true });

    expect(screen.getByTestId('contextRemoveAutomationButton')).toBeDisabled();
  });
});
