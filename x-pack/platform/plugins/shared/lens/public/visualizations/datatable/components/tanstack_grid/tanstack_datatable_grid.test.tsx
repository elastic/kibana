/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EuiDataGridColumn } from '@elastic/eui';
import { TanStackDatatableGrid } from './tanstack_datatable_grid';
import type { TanStackCellValueProps, TanStackDatatableGridProps } from './types';

const rows = [
  { a: 'a0', b: 'b0' },
  { a: 'a1', b: 'b1' },
  { a: 'a2', b: 'b2' },
];

const columns: EuiDataGridColumn[] = [
  { id: 'a', displayAsText: 'Column A', initialWidth: 200 },
  { id: 'b', displayAsText: 'Column B' },
];

const renderCellValue = ({ rowIndex, columnId }: TanStackCellValueProps) => (
  <>{rows[rowIndex]?.[columnId as 'a' | 'b']}</>
);

const defaultProps: TanStackDatatableGridProps = {
  'aria-label': 'Test table',
  'data-test-subj': 'testGrid',
  columns,
  rowCount: rows.length,
  renderCellValue,
};

const getCell = (text: string) => screen.getByText(text).closest<HTMLElement>('[role="gridcell"]')!;

describe('TanStackDatatableGrid', () => {
  // jsdom has no layout, give the scroll container a size so the virtualizer renders rows.
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('renders headers and cells with grid semantics', () => {
    render(<TanStackDatatableGrid {...defaultProps} />);
    const grid = screen.getByRole('grid', { name: 'Test table' });
    expect(grid).toHaveAttribute('aria-rowcount', '4');
    expect(grid).toHaveAttribute('aria-colcount', '2');
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Column A',
      'Column B',
    ]);
    expect(screen.getByTestId('dataGridHeaderCell-a')).toHaveAttribute('aria-colindex', '1');
    expect(getCell('b1')).toHaveAttribute('aria-colindex', '2');
    expect(getCell('b1').closest('[role="row"]')).toHaveAttribute('aria-rowindex', '3');
  });

  it('renders leading and trailing control columns', () => {
    render(
      <TanStackDatatableGrid
        {...defaultProps}
        leadingControlColumns={[
          {
            id: 'rowNumber',
            width: 50,
            headerCellRender: () => null,
            rowCellRender: ({ rowIndex }) => <span data-test-subj="rowNumber">{rowIndex + 1}</span>,
          },
        ]}
        trailingControlColumns={[
          {
            id: 'actions',
            width: 40,
            headerCellRender: () => <span>Actions</span>,
            rowCellRender: () => <button>Row action</button>,
          },
        ]}
      />
    );
    expect(screen.getByRole('grid')).toHaveAttribute('aria-colcount', '4');
    expect(screen.getAllByTestId('rowNumber').map((cell) => cell.textContent)).toEqual([
      '1',
      '2',
      '3',
    ]);
    expect(screen.getAllByRole('button', { name: 'Row action' })).toHaveLength(3);
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(getCell('a0')).toHaveAttribute('aria-colindex', '2');
  });

  it('applies cell props set by the cell renderer', () => {
    const Colored = ({ rowIndex, columnId, setCellProps }: TanStackCellValueProps) => {
      React.useEffect(() => {
        setCellProps({ style: { backgroundColor: rowIndex === 1 ? 'red' : undefined } });
      }, [rowIndex, setCellProps]);
      return <>{`${columnId}-${rowIndex}`}</>;
    };
    render(<TanStackDatatableGrid {...defaultProps} renderCellValue={Colored} />);
    expect(getCell('a-1')).toHaveStyle({ backgroundColor: 'red' });
    expect(getCell('a-0')).not.toHaveStyle({ backgroundColor: 'red' });
  });

  it('only renders the rows within the viewport', () => {
    const manyRows = Array.from({ length: 1000 }, (_, i) => i);
    render(
      <TanStackDatatableGrid
        {...defaultProps}
        rowCount={manyRows.length}
        renderCellValue={({ rowIndex }) => <>{`row-${rowIndex}`}</>}
      />
    );
    const renderedRows = screen.getAllByRole('row').filter((row) => row.hasAttribute('data-index'));
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(50);
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '1001');
  });

  it('renders no rows for an empty data set', () => {
    render(<TanStackDatatableGrid {...defaultProps} rowCount={0} />);
    expect(screen.queryAllByRole('gridcell')).toHaveLength(0);
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
  });

  describe('header menu and sorting', () => {
    // The popover panel is not interactive while it animates in.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const openMenu = async (columnId: string) => {
      await user.click(screen.getByTestId(`dataGridHeaderCellActionButton-${columnId}`));
    };

    it('triggers sorting from the header menu and toggles the active sort off', async () => {
      const onSort = jest.fn();
      const { rerender } = render(
        <TanStackDatatableGrid {...defaultProps} sorting={{ columns: [], onSort }} />
      );
      await openMenu('a');
      await user.click(screen.getByTestId('dataGridHeaderCellActionSortDesc'));
      expect(onSort).toHaveBeenLastCalledWith([{ id: 'a', direction: 'desc' }]);

      rerender(
        <TanStackDatatableGrid
          {...defaultProps}
          sorting={{ columns: [{ id: 'a', direction: 'desc' }], onSort }}
        />
      );
      expect(screen.getByTestId('dataGridHeaderCell-a')).toHaveAttribute('aria-sort', 'descending');
      expect(screen.getByTestId('dataGridHeaderCellSortIcon-a')).toBeInTheDocument();
      await openMenu('a');
      await user.click(screen.getByTestId('dataGridHeaderCellActionSortDesc'));
      expect(onSort).toHaveBeenLastCalledWith([]);
    });

    it('renders custom labels and additional actions, and honors disabled actions', async () => {
      const onReset = jest.fn();
      const onSort = jest.fn();
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          sorting={{ columns: [], onSort }}
          columns={[
            {
              id: 'a',
              displayAsText: 'Column A',
              actions: {
                showSortAsc: { label: 'Custom ascending' },
                showSortDesc: false,
                additional: [
                  { label: 'Reset width', onClick: onReset, 'data-test-subj': 'resetWidth' },
                ],
              },
            },
            { id: 'b', displayAsText: 'Column B', actions: false },
          ]}
        />
      );
      expect(screen.queryByTestId('dataGridHeaderCellActionButton-b')).not.toBeInTheDocument();
      await openMenu('a');
      expect(screen.getByText('Custom ascending')).toBeInTheDocument();
      expect(screen.queryByTestId('dataGridHeaderCellActionSortDesc')).not.toBeInTheDocument();
      await user.click(screen.getByTestId('resetWidth'));
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('has no menu without sorting or actions', () => {
      render(<TanStackDatatableGrid {...defaultProps} />);
      expect(screen.queryByTestId('dataGridHeaderCellActionButton-a')).not.toBeInTheDocument();
    });
  });

  describe('column resizing', () => {
    // jsdom has no PointerEvent: fall back to a MouseEvent, which carries the coordinates.
    beforeAll(() => {
      Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, configurable: true });
    });

    it('applies the dragged width and reports it when the drag ends', () => {
      const onColumnResize = jest.fn();
      render(<TanStackDatatableGrid {...defaultProps} onColumnResize={onColumnResize} />);
      const header = screen.getByTestId('dataGridHeaderCell-a');
      jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
      const handle = screen.getByTestId('dataGridColumnResizer-a');

      fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
      expect(
        screen.getByTestId('testGrid').style.getPropertyValue('--lnsTanStackGridColumnWidth-1')
      ).toBe('260px');
      fireEvent.pointerUp(handle, { pointerId: 1 });

      expect(onColumnResize).toHaveBeenCalledTimes(1);
      expect(onColumnResize).toHaveBeenCalledWith({ columnId: 'a', width: 260 });
    });

    it('does not offer resizing for non resizable columns and control columns', () => {
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          columns={[{ id: 'a', displayAsText: 'Column A', isResizable: false }]}
          leadingControlColumns={[
            { id: 'ctrl', width: 40, headerCellRender: () => null, rowCellRender: () => null },
          ]}
        />
      );
      expect(screen.queryAllByRole('separator')).toHaveLength(0);
    });

    it('drops the dragged width when the initial width changes', () => {
      const onColumnResize = jest.fn();
      const { rerender } = render(
        <TanStackDatatableGrid {...defaultProps} onColumnResize={onColumnResize} />
      );
      const header = screen.getByTestId('dataGridHeaderCell-a');
      jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
      const handle = screen.getByTestId('dataGridColumnResizer-a');
      fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
      fireEvent.pointerUp(handle, { pointerId: 1 });

      // "Reset width": the owner clears the persisted width.
      rerender(
        <TanStackDatatableGrid
          {...defaultProps}
          columns={[{ id: 'a', displayAsText: 'Column A' }, columns[1]]}
        />
      );
      expect(
        screen.getByTestId('testGrid').style.getPropertyValue('--lnsTanStackGridColumnWidth-1')
      ).toBe('');
    });
  });

  describe('pagination', () => {
    const pageRows = Array.from({ length: 25 }, (_, i) => i);
    const renderPage = (pageIndex: number, onChangePage = jest.fn()) =>
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          rowCount={pageRows.length}
          renderCellValue={({ rowIndex, columnId }) => <>{`${columnId}${rowIndex}`}</>}
          pagination={{
            pageIndex,
            pageSize: 10,
            pageSizeOptions: [10, 20],
            onChangePage,
            onChangeItemsPerPage: jest.fn(),
          }}
        />
      );

    it('renders only the rows of the current page with absolute row indexes', () => {
      renderPage(2);
      expect(screen.getAllByRole('gridcell').length).toBe(10); // 5 rows x 2 columns
      expect(screen.getByText('a20')).toBeInTheDocument();
      expect(screen.getByText('a24')).toBeInTheDocument();
      expect(screen.queryByText('a19')).not.toBeInTheDocument();
      expect(screen.getByText('a20').closest('[role="row"]')).toHaveAttribute(
        'aria-rowindex',
        '22'
      );
      expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '26');
    });

    it('changes page', async () => {
      const onChangePage = jest.fn();
      renderPage(0, onChangePage);
      await userEvent.click(screen.getByTestId('pagination-button-next'));
      expect(onChangePage).toHaveBeenCalledWith(1);
    });

    it('navigates with the keyboard within the page', async () => {
      renderPage(1);
      screen.getByText('a10').closest<HTMLElement>('[role="gridcell"]')!.focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByText('a11').closest('[role="gridcell"]')).toHaveFocus();
      await userEvent.keyboard('{ArrowUp}{ArrowUp}');
      expect(screen.getByTestId('dataGridHeaderCell-a')).toHaveFocus();
    });
  });

  describe('cell actions and expansion', () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onFilter = jest.fn();
    const actionColumns: EuiDataGridColumn[] = [
      {
        id: 'a',
        displayAsText: 'Column A',
        cellActions: [
          ({ rowIndex, Component }) => (
            <Component
              data-test-subj="filterFor"
              aria-label={`Filter for ${rows[rowIndex].a}`}
              iconType="plusCircle"
              onClick={() => onFilter(rowIndex)}
            >
              Filter for
            </Component>
          ),
          ({ Component }) => (
            <Component
              data-test-subj="disabledAction"
              iconType="minusCircle"
              disabled
              title="Not filterable"
            >
              Filter out
            </Component>
          ),
        ],
      },
      { id: 'b', displayAsText: 'Column B' },
    ];

    beforeEach(() => onFilter.mockClear());

    // The cell is focused instead of hovered: jsdom reports the pointer leaving the cell when the
    // open bubble moves to a portal, whereas focus keeps the cell active.
    const openBubble = async (cell: HTMLElement) => {
      cell.focus();
      await user.click(await within(cell).findByTestId('tanStackCellActionsButton'));
    };

    it('only mounts the cell actions for the hovered cell and runs them', async () => {
      render(<TanStackDatatableGrid {...defaultProps} columns={actionColumns} />);
      expect(screen.queryAllByTestId('tanStackCellActionsButton')).toHaveLength(0);

      await openBubble(getCell('a1'));
      // jsdom has no layout, so the open bubble is rendered in a portal.
      await user.click(await screen.findByTestId('filterFor'));
      expect(onFilter).toHaveBeenCalledWith(1);
    });

    it('renders the actions in the popover footer and closes it after an action', async () => {
      render(<TanStackDatatableGrid {...defaultProps} columns={actionColumns} />);
      await openBubble(getCell('a0'));
      await user.click(await screen.findByTestId('euiDataGridCellExpandButton'));

      const popover = await screen.findByTestId('euiDataGridExpansionPopover');
      expect(within(popover).getByText('a0')).toBeInTheDocument();
      expect(within(popover).getByTestId('disabledAction')).toBeDisabled();

      await user.click(within(popover).getByTestId('filterFor'));
      expect(onFilter).toHaveBeenCalledWith(0);
      expect(screen.queryByTestId('euiDataGridExpansionPopover')).not.toBeInTheDocument();
    });

    it('renders the cell value as expanded in the popover and supports a custom popover', async () => {
      const Value = ({ columnId, rowIndex, isExpanded, isDetails }: TanStackCellValueProps) => (
        <>{`${columnId}${rowIndex}${isExpanded ? '-expanded' : ''}${
          isDetails ? '-details' : ''
        }`}</>
      );
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          columns={actionColumns}
          renderCellValue={Value}
          renderCellPopover={({ children, cellActions }) => (
            <div data-test-subj="customPopover">
              {children}
              {cellActions}
            </div>
          )}
        />
      );
      getCell('b1').focus();
      await user.keyboard('{Enter}');
      const popover = await screen.findByTestId('customPopover');
      expect(popover).toHaveTextContent('b1-expanded-details');
    });

    it('does not offer expansion for columns that are not expandable', async () => {
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          columns={[{ id: 'a', displayAsText: 'Column A', isExpandable: false }, columns[1]]}
        />
      );
      await user.hover(getCell('a0'));
      expect(
        within(getCell('a0')).queryByTestId('tanStackCellActionsButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('renders a summary row when a footer renderer is provided', () => {
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          renderFooterCellValue={({ columnId }) => (columnId === 'a' ? <>Total: 3</> : null)}
        />
      );
      expect(screen.getByTestId('dataGridFooterCell-a')).toHaveTextContent('Total: 3');
      expect(screen.getByTestId('dataGridFooterCell-b')).toBeEmptyDOMElement();
      expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '5');
    });

    it('does not render a footer without a footer renderer', () => {
      render(<TanStackDatatableGrid {...defaultProps} />);
      expect(screen.queryByTestId('dataGridFooterCell-a')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('exposes a single tab stop', () => {
      render(<TanStackDatatableGrid {...defaultProps} />);
      const tabStops = screen
        .getAllByRole('gridcell')
        .concat(screen.getAllByRole('columnheader'))
        .filter((cell) => cell.getAttribute('tabindex') === '0');
      expect(tabStops).toEqual([getCell('a0')]);
    });

    it('moves focus and the tab stop with the arrow keys', async () => {
      render(<TanStackDatatableGrid {...defaultProps} />);
      getCell('a0').focus();

      await userEvent.keyboard('{ArrowRight}');
      expect(getCell('b0')).toHaveFocus();
      expect(getCell('b0')).toHaveAttribute('tabindex', '0');
      expect(getCell('a0')).toHaveAttribute('tabindex', '-1');

      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      expect(getCell('b2')).toHaveFocus();

      await userEvent.keyboard('{Home}');
      expect(getCell('a2')).toHaveFocus();

      await userEvent.keyboard('{Control>}{Home}{/Control}');
      expect(screen.getByTestId('dataGridHeaderCell-a')).toHaveFocus();
    });
  });
});
