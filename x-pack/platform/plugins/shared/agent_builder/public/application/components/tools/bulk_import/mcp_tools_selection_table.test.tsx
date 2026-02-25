/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { Tool as McpTool } from '@kbn/mcp-client';
import {
  McpToolsSelectionTable,
  type McpToolsSelectionTableProps,
} from './mcp_tools_selection_table';
import type { McpToolField } from './types';

const generateTools = (count: number): McpTool[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `tool_${String(i + 1).padStart(3, '0')}`,
    description: `Description for tool ${i + 1}`,
    inputSchema: {},
  }));

const toSelectedFields = (tools: McpTool[]): McpToolField[] =>
  tools.map((t) => ({ name: t.name, description: t.description ?? '' }));

const DEFAULT_PROPS: McpToolsSelectionTableProps = {
  tools: [],
  selectedTools: [],
  onChange: jest.fn(),
  isLoading: false,
  isError: false,
  isDisabled: false,
};

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiThemeProvider>
    <IntlProvider locale="en">{children}</IntlProvider>
  </EuiThemeProvider>
);

const renderTable = (overrides: Partial<McpToolsSelectionTableProps> = {}) => {
  const props = { ...DEFAULT_PROPS, ...overrides };
  return render(<McpToolsSelectionTable {...props} />, { wrapper: Wrapper });
};

const getCheckboxForRow = (toolName: string) => screen.getByTestId(`checkboxSelectRow-${toolName}`);

const getNextPageButton = () => screen.getByTestId('pagination-button-next');

const flushMicrotasks = () => act(() => new Promise((resolve) => queueMicrotask(resolve)));

describe('McpToolsSelectionTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tools in the table', () => {
    const tools = generateTools(3);
    renderTable({ tools });

    expect(screen.getByText('tool_001')).toBeInTheDocument();
    expect(screen.getByText('tool_002')).toBeInTheDocument();
    expect(screen.getByText('tool_003')).toBeInTheDocument();
  });

  it('shows checkboxes as checked for selectedTools', () => {
    const tools = generateTools(3);
    const selectedTools = toSelectedFields([tools[0], tools[2]]);
    renderTable({ tools, selectedTools });

    expect(getCheckboxForRow('tool_001')).toBeChecked();
    expect(getCheckboxForRow('tool_002')).not.toBeChecked();
    expect(getCheckboxForRow('tool_003')).toBeChecked();
  });

  it('calls onChange when a checkbox is clicked', async () => {
    const tools = generateTools(3);
    const onChange = jest.fn();
    renderTable({ tools, onChange });

    await userEvent.click(getCheckboxForRow('tool_001'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'tool_001' })])
    );
  });

  describe('cross-page selection persistence', () => {
    it('does not fire onChange during page navigation', async () => {
      const tools = generateTools(15);
      const onChange = jest.fn();
      const selectedTools = toSelectedFields([tools[0], tools[2]]);

      renderTable({ tools, selectedTools, onChange });

      // Verify page-1 checkboxes are checked
      expect(getCheckboxForRow('tool_001')).toBeChecked();
      expect(getCheckboxForRow('tool_003')).toBeChecked();

      // Navigate to page 2
      await userEvent.click(getNextPageButton());
      await flushMicrotasks();

      // The key assertion: onChange should NOT have been called during page
      // navigation. Without the fix, EuiBasicTable.onPageChange calls
      // clearSelection() which fires onSelectionChange([]), wiping form state.
      expect(onChange).not.toHaveBeenCalled();
    });

    it('shows correct checkboxes after navigating back to page 1', async () => {
      const tools = generateTools(15);
      const onChange = jest.fn();
      const selectedTools = toSelectedFields([tools[0], tools[2]]);

      renderTable({ tools, selectedTools, onChange });

      expect(getCheckboxForRow('tool_001')).toBeChecked();
      expect(getCheckboxForRow('tool_003')).toBeChecked();

      // Navigate to page 2 then back to page 1
      await userEvent.click(getNextPageButton());
      await flushMicrotasks();
      await userEvent.click(screen.getByTestId('pagination-button-previous'));
      await flushMicrotasks();

      // Page-1 selections should still be visible
      expect(getCheckboxForRow('tool_001')).toBeChecked();
      expect(getCheckboxForRow('tool_003')).toBeChecked();
    });

    it('merges selections from different pages', async () => {
      const tools = generateTools(15);
      const onChange = jest.fn();
      const initialSelected = toSelectedFields([tools[0]]);

      renderTable({ tools, selectedTools: initialSelected, onChange });
      expect(getCheckboxForRow('tool_001')).toBeChecked();

      // Navigate to page 2
      await userEvent.click(getNextPageButton());
      await flushMicrotasks();
      onChange.mockClear();

      // Click tool_011 on page 2
      await userEvent.click(getCheckboxForRow('tool_011'));

      // onChange should include both the off-page tool_001 AND the new tool_011
      expect(onChange).toHaveBeenCalledTimes(1);
      const calledWith = onChange.mock.calls[0][0] as McpTool[];
      const selectedNames = calledWith.map((t: McpTool) => t.name);
      expect(selectedNames).toContain('tool_001');
      expect(selectedNames).toContain('tool_011');
    });

    it('does not lose selections when page size changes', async () => {
      const tools = generateTools(30);
      const onChange = jest.fn();
      const selectedTools = toSelectedFields([tools[0], tools[1]]);

      renderTable({ tools, selectedTools, onChange });

      expect(getCheckboxForRow('tool_001')).toBeChecked();
      expect(getCheckboxForRow('tool_002')).toBeChecked();

      // Change page size via the rows-per-page selector
      const perPageButton = screen.getByTestId('tablePaginationPopoverButton');
      await userEvent.click(perPageButton);

      const option25 = screen.getByTestId('tablePagination-25-rows');
      await userEvent.click(option25);
      await flushMicrotasks();

      // Selections should not have been cleared
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('clear and select all', () => {
    it('handleClearSelection clears all selections via onChange([])', async () => {
      const tools = generateTools(15);
      const onChange = jest.fn();
      const selectedTools = toSelectedFields([tools[0], tools[1]]);
      renderTable({ tools, selectedTools, onChange });

      // The "Clear selection" button appears in the header when items are selected
      const clearButton = screen.getByTestId('bulkImportMcpToolsClearSelectionButton');
      await userEvent.click(clearButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });
});
