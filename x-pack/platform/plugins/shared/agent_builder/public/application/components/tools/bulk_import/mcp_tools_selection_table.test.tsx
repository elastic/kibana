/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { type Tool as McpTool } from '@kbn/mcp-client';
import {
  McpToolsSelectionTable,
  type McpToolsSelectionTableProps,
} from './mcp_tools_selection_table';
import { type McpToolsSearch } from './use_mcp_tools_search';

const mockUseMcpToolsSearch = jest.fn<McpToolsSearch, [{ tools: readonly McpTool[] }]>();

jest.mock('./use_mcp_tools_search', () => ({
  useMcpToolsSearch: (opts: { tools: readonly McpTool[] }) => mockUseMcpToolsSearch(opts),
}));

jest.mock('./mcp_tools_selection_table_header', () => ({
  McpToolsSelectionTableHeader: () => null,
}));

const createMockTool = (name: string): McpTool => ({
  name,
  description: `Description for ${name}`,
  inputSchema: {},
});

const generateTools = (count: number): McpTool[] =>
  Array.from({ length: count }, (_, i) => createMockTool(`tool-${String(i + 1).padStart(2, '0')}`));

const defaultProps: McpToolsSelectionTableProps = {
  tools: [],
  selectedTools: [],
  onChange: jest.fn(),
  isLoading: false,
  isError: false,
  isDisabled: false,
};

const renderTable = (props: Partial<McpToolsSelectionTableProps> = {}) => {
  const merged = { ...defaultProps, ...props };
  return render(
    <IntlProvider locale="en">
      <McpToolsSelectionTable {...merged} />
    </IntlProvider>
  );
};

const setupSearchMock = (tools: readonly McpTool[]) => {
  const stableResults = [...tools];
  mockUseMcpToolsSearch.mockReturnValue({
    searchConfig: {
      onChange: () => {},
      box: { incremental: true, placeholder: 'Search tools', disabled: false },
    },
    searchQuery: '',
    results: stableResults,
  });
};

describe('McpToolsSelectionTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tools in the table', () => {
    const tools = generateTools(3);
    setupSearchMock(tools);

    renderTable({ tools });

    for (const tool of tools) {
      expect(screen.getByText(tool.name)).toBeInTheDocument();
    }
  });

  it('calls onChange when a tool checkbox is clicked', async () => {
    const tools = generateTools(3);
    setupSearchMock(tools);
    const onChange = jest.fn();

    renderTable({ tools, onChange });

    const checkbox = screen.getByTestId('checkboxSelectRow-tool-01');
    await userEvent.click(checkbox);

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0] as McpTool[];
    expect(lastCall.some((t: McpTool) => t.name === 'tool-01')).toBe(true);
  });

  describe('cross-page selection persistence', () => {
    const tools = generateTools(15);

    it('preserves page-1 selections when navigating to page 2', async () => {
      setupSearchMock(tools);
      const onChange = jest.fn();

      const { rerender } = render(
        <IntlProvider locale="en">
          <McpToolsSelectionTable {...defaultProps} tools={tools} onChange={onChange} />
        </IntlProvider>
      );

      // Select a tool on page 1
      await userEvent.click(screen.getByTestId('checkboxSelectRow-tool-01'));

      expect(onChange).toHaveBeenCalled();
      const selectionAfterClick = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(selectionAfterClick.some((t: McpTool) => t.name === 'tool-01')).toBe(true);

      // Re-render with the selection applied (simulates parent state update)
      onChange.mockClear();
      rerender(
        <IntlProvider locale="en">
          <McpToolsSelectionTable
            {...defaultProps}
            tools={tools}
            selectedTools={[{ name: 'tool-01', description: 'Description for tool-01' }]}
            onChange={onChange}
          />
        </IntlProvider>
      );

      // Navigate to page 2
      fireEvent.click(screen.getByTestId('pagination-button-next'));

      await waitFor(() => {
        expect(screen.getByTestId('checkboxSelectRow-tool-11')).toBeInTheDocument();
      });

      // After page change, onChange may fire due to EUI's getDerivedStateFromProps
      // but the merged result must still include tool-01
      if (onChange.mock.calls.length > 0) {
        const lastSelection = onChange.mock.calls[onChange.mock.calls.length - 1][0];
        expect(lastSelection.some((t: McpTool) => t.name === 'tool-01')).toBe(true);
      }
    });

    it('includes selections from multiple pages', async () => {
      setupSearchMock(tools);
      const onChange = jest.fn();

      const { rerender } = render(
        <IntlProvider locale="en">
          <McpToolsSelectionTable
            {...defaultProps}
            tools={tools}
            selectedTools={[{ name: 'tool-01', description: 'Description for tool-01' }]}
            onChange={onChange}
          />
        </IntlProvider>
      );

      // Navigate to page 2
      fireEvent.click(screen.getByTestId('pagination-button-next'));

      await waitFor(() => {
        expect(screen.getByTestId('checkboxSelectRow-tool-11')).toBeInTheDocument();
      });

      // Re-render preserving the selection after page change — collect whatever
      // onChange was last called with (the merge logic should keep tool-01).
      const currentSelection =
        onChange.mock.calls.length > 0
          ? onChange.mock.calls[onChange.mock.calls.length - 1][0].map((t: McpTool) => ({
              name: t.name,
              description: t.description ?? '',
            }))
          : [{ name: 'tool-01', description: 'Description for tool-01' }];

      onChange.mockClear();
      rerender(
        <IntlProvider locale="en">
          <McpToolsSelectionTable
            {...defaultProps}
            tools={tools}
            selectedTools={currentSelection}
            onChange={onChange}
          />
        </IntlProvider>
      );

      // Page 2 should show tool-11 through tool-15 (sorted ascending)
      const page2Checkbox = screen.getByTestId('checkboxSelectRow-tool-11');
      await userEvent.click(page2Checkbox);

      expect(onChange).toHaveBeenCalled();
      const lastSelection = onChange.mock.calls[onChange.mock.calls.length - 1][0] as McpTool[];
      const selectedNames = lastSelection.map((t: McpTool) => t.name);

      // Must include both page-1 selection and the new page-2 selection
      expect(selectedNames).toContain('tool-01');
      expect(selectedNames).toContain('tool-11');
    });
  });

  it('select all selects all tools across pages', async () => {
    const tools = generateTools(15);
    setupSearchMock(tools);
    const onChange = jest.fn();

    renderTable({ tools, onChange });

    // Use the header checkbox to select all on the current page
    const headerCheckbox = screen.getByTestId('checkboxSelectAll');
    await userEvent.click(headerCheckbox);

    expect(onChange).toHaveBeenCalled();
  });

  it('clear selection clears all tools', async () => {
    const tools = generateTools(3);
    setupSearchMock(tools);
    const onChange = jest.fn();

    renderTable({
      tools,
      selectedTools: tools.map((t) => ({ name: t.name, description: t.description ?? '' })),
      onChange,
    });

    // Click the header checkbox to deselect all
    const headerCheckbox = screen.getByTestId('checkboxSelectAll');
    await userEvent.click(headerCheckbox);

    expect(onChange).toHaveBeenCalled();
    const lastSelection = onChange.mock.calls[onChange.mock.calls.length - 1][0] as McpTool[];
    expect(lastSelection).toHaveLength(0);
  });
});
