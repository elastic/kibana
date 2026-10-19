/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import axe from 'axe-core';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    // Same attributes as EuiDataGrid, which tests use to find cells.
    expect(getCell('b1')).toHaveAttribute('data-gridcell-column-index', '1');
    expect(getCell('b1')).toHaveAttribute('data-gridcell-visible-row-index', '1');
    expect(screen.getByTestId('dataGridHeaderCell-b')).toHaveAttribute(
      'data-gridcell-column-index',
      '1'
    );
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

    it('applies the dragged width and reports it when the drag ends', async () => {
      const onColumnResize = jest.fn();
      render(<TanStackDatatableGrid {...defaultProps} onColumnResize={onColumnResize} />);
      const header = screen.getByTestId('dataGridHeaderCell-a');
      jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
      const handle = screen.getByTestId('dataGridColumnResizer-a');

      fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 160, pointerId: 1 });
      await waitFor(() =>
        expect(
          screen.getByTestId('testGrid').style.getPropertyValue('--lnsTanStackGridColumnWidth-1')
        ).toBe('260px')
      );
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

  describe('column resizing performance', () => {
    beforeAll(() => {
      Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, configurable: true });
    });

    it('does not re-render the cells while a column is dragged', async () => {
      const renderCell = jest.fn(({ rowIndex }: TanStackCellValueProps) => (
        <>{`cell-${rowIndex}`}</>
      ));
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          columns={[{ id: 'a', displayAsText: 'Column A', initialWidth: 200 }, columns[1]]}
          renderCellValue={renderCell}
        />
      );
      const header = screen.getByTestId('dataGridHeaderCell-a');
      jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
      const handle = screen.getByTestId('dataGridColumnResizer-a');
      const rendersBeforeDrag = renderCell.mock.calls.length;

      fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
      const dragTo = async (clientX: number) => {
        fireEvent.pointerMove(handle, { clientX, pointerId: 1 });
        await waitFor(() =>
          expect(
            screen.getByTestId('testGrid').style.getPropertyValue('--lnsTanStackGridColumnWidth-1')
          ).toBe(`${200 + clientX - 100}px`)
        );
      };
      await dragTo(110);
      await dragTo(120);
      await dragTo(140);
      fireEvent.pointerUp(handle, { pointerId: 1 });

      expect(renderCell.mock.calls.length).toBe(rendersBeforeDrag);
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

  describe('onRender', () => {
    it('is called once the rows are rendered, and again when the data changes', async () => {
      const onRender = jest.fn();
      const { rerender } = render(<TanStackDatatableGrid {...defaultProps} onRender={onRender} />);
      await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
      expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);

      rerender(
        <TanStackDatatableGrid
          {...defaultProps}
          onRender={onRender}
          renderCellValue={({ rowIndex }) => <>{`changed-${rowIndex}`}</>}
        />
      );
      await waitFor(() => expect(onRender).toHaveBeenCalledTimes(2));
    });

    it('is called for an empty data set', async () => {
      const onRender = jest.fn();
      render(<TanStackDatatableGrid {...defaultProps} rowCount={0} onRender={onRender} />);
      await waitFor(() => expect(onRender).toHaveBeenCalledTimes(1));
    });
  });

  describe('accessibility', () => {
    it('has no axe violations', async () => {
      const { container } = render(
        <TanStackDatatableGrid
          {...defaultProps}
          sorting={{ columns: [{ id: 'a', direction: 'asc' }], onSort: jest.fn() }}
          renderFooterCellValue={({ columnId }) => <>{`Footer ${columnId}`}</>}
          pagination={{
            pageIndex: 0,
            pageSize: 10,
            pageSizeOptions: [10, 20],
            onChangePage: jest.fn(),
            onChangeItemsPerPage: jest.fn(),
          }}
        />
      );
      // Color contrast needs real layout and styles, which jsdom does not provide.
      const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
      expect(results.violations.map(({ id, nodes }) => `${id}: ${nodes.length}`)).toEqual([]);
    });
  });

  describe('keyboard accessibility of the header', () => {
    const sorting = { columns: [], onSort: jest.fn() };

    it('opens the menu with Enter or F2 on the focused header', async () => {
      render(<TanStackDatatableGrid {...defaultProps} sorting={sorting} />);
      screen.getByTestId('dataGridHeaderCell-a').focus();
      await userEvent.keyboard('{Enter}');
      expect(await screen.findByTestId('dataGridHeaderCellActionGroup-a')).toBeInTheDocument();
    });

    it('resizes a column with Alt and the arrow keys', async () => {
      const onColumnResize = jest.fn();
      render(<TanStackDatatableGrid {...defaultProps} onColumnResize={onColumnResize} />);
      const header = screen.getByTestId('dataGridHeaderCell-a');
      jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
      expect(header).toHaveAttribute('aria-keyshortcuts', 'Alt+ArrowLeft Alt+ArrowRight');

      header.focus();
      await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(onColumnResize).toHaveBeenLastCalledWith({ columnId: 'a', width: 210 });
      await userEvent.keyboard('{Alt>}{ArrowLeft}{/Alt}');
      expect(onColumnResize).toHaveBeenLastCalledWith({ columnId: 'a', width: 190 });
      // Alt with the arrow keys does not move the focus.
      expect(header).toHaveFocus();
    });

    it('does not resize columns that are not resizable', async () => {
      const onColumnResize = jest.fn();
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          columns={[{ id: 'a', displayAsText: 'Column A', isResizable: false }]}
          onColumnResize={onColumnResize}
        />
      );
      const header = screen.getByTestId('dataGridHeaderCell-a');
      expect(header).not.toHaveAttribute('aria-keyshortcuts');
      header.focus();
      await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(onColumnResize).not.toHaveBeenCalled();
    });
  });

  describe('footer navigation and pagination semantics', () => {
    it('makes the footer reachable with the keyboard', async () => {
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          renderFooterCellValue={({ columnId }) => <>{`Footer ${columnId}`}</>}
        />
      );
      getCell('a2').focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByTestId('dataGridFooterCell-a')).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByTestId('dataGridFooterCell-b')).toHaveFocus();
      await userEvent.keyboard('{ArrowUp}');
      expect(getCell('b2')).toHaveFocus();
    });

    it('moves by pages with PageUp and PageDown', async () => {
      const manyRows = Array.from({ length: 40 }, (_, i) => i);
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          rowCount={manyRows.length}
          renderCellValue={({ rowIndex, columnId }) => <>{`${columnId}${rowIndex}`}</>}
        />
      );
      screen.getByText('a0').closest<HTMLElement>('[role="gridcell"]')!.focus();
      await userEvent.keyboard('{PageDown}');
      expect(screen.getByText('a10').closest('[role="gridcell"]')).toHaveFocus();
      await userEvent.keyboard('{PageUp}');
      expect(screen.getByText('a0').closest('[role="gridcell"]')).toHaveFocus();
    });

    it('links the pagination to the grid', () => {
      const { container } = render(
        <TanStackDatatableGrid
          {...defaultProps}
          pagination={{
            pageIndex: 0,
            pageSize: 10,
            onChangePage: jest.fn(),
            onChangeItemsPerPage: jest.fn(),
          }}
        />
      );
      const grid = screen.getByRole('grid');
      expect(grid.id).not.toBe('');
      expect(container.querySelector(`[aria-controls="${grid.id}"]`)).toBeInTheDocument();
    });

    it('shows the content of truncated cells as a title when it does not fit', async () => {
      render(<TanStackDatatableGrid {...defaultProps} />);
      const content = getCell('a0').querySelector<HTMLElement>(
        '[data-test-subj="lnsTanStackGridCellContent"]'
      )!;
      jest.spyOn(content, 'scrollWidth', 'get').mockReturnValue(300);
      jest.spyOn(content, 'clientWidth', 'get').mockReturnValue(100);
      await userEvent.hover(content);
      expect(content).toHaveAttribute('title', 'a0');

      jest.spyOn(content, 'scrollWidth', 'get').mockReturnValue(50);
      await userEvent.unhover(content);
      await userEvent.hover(content);
      expect(content).toHaveAttribute('title', '');
    });
  });

  describe('interactive cell content', () => {
    const onLinkClick = jest.fn();
    const renderLinkCells = () =>
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          renderCellValue={({ rowIndex, columnId }) => (
            <button
              onClick={() => onLinkClick(`${columnId}${rowIndex}`)}
            >{`${columnId}${rowIndex}`}</button>
          )}
        />
      );

    beforeEach(() => onLinkClick.mockClear());

    it('takes interactive content out of the tab order', () => {
      renderLinkCells();
      screen.getAllByRole('button', { name: /^[ab][0-2]$/ }).forEach((button) => {
        expect(button).toHaveAttribute('tabindex', '-1');
      });
    });

    it('keeps the grid a single tab stop when focus moves from cell to cell', async () => {
      renderLinkCells();
      screen.getByRole('button', { name: 'a0' }).closest<HTMLElement>('[role="gridcell"]')!.focus();
      await userEvent.tab();
      // Nothing in the grid is left to tab to: the cell content is skipped.
      expect(screen.getByRole('grid')).not.toContainElement(document.activeElement as HTMLElement);
    });

    it('enters interactive mode with Enter, makes the content usable, and leaves it with Escape', async () => {
      renderLinkCells();
      const cell = screen
        .getByRole('button', { name: 'a1' })
        .closest<HTMLElement>('[role="gridcell"]')!;
      cell.focus();

      await userEvent.keyboard('{Enter}');
      const button = screen.getByRole('button', { name: 'a1' });
      expect(button).toHaveFocus();
      expect(button).not.toHaveAttribute('tabindex', '-1');
      await userEvent.keyboard('{Enter}');
      expect(onLinkClick).toHaveBeenCalledWith('a1');

      await userEvent.keyboard('{Escape}');
      expect(cell).toHaveFocus();
      expect(screen.getByRole('button', { name: 'a1' })).toHaveAttribute('tabindex', '-1');
    });

    it('leaves interactive mode when focus leaves the cell', async () => {
      renderLinkCells();
      const cell = screen
        .getByRole('button', { name: 'a1' })
        .closest<HTMLElement>('[role="gridcell"]')!;
      cell.focus();
      await userEvent.keyboard('{Enter}');
      act(() =>
        screen
          .getByRole('button', { name: 'b1' })
          .closest<HTMLElement>('[role="gridcell"]')!
          .focus()
      );
      expect(screen.getByRole('button', { name: 'a1' })).toHaveAttribute('tabindex', '-1');
    });

    it('applies to interactive content that is rendered later, and to control columns', async () => {
      // The cell renders again when it sets its props, which jsdom's no-op MutationObserver cannot
      // do for content that changes on its own.
      const Later = ({ rowIndex, setCellProps }: TanStackCellValueProps) => {
        const [show, setShow] = React.useState(false);
        React.useEffect(() => {
          setShow(true);
          setCellProps({ className: 'loaded' });
        }, [setCellProps]);
        return show ? <a href="#a">{`link-${rowIndex}`}</a> : null;
      };
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          renderCellValue={Later}
          trailingControlColumns={[
            {
              id: 'actions',
              width: 40,
              headerCellRender: () => null,
              rowCellRender: () => <button>Row action</button>,
            },
          ]}
        />
      );
      // Content that is rendered later is taken out of the tab order too.
      await waitFor(() =>
        expect(screen.getAllByRole('link', { name: 'link-0' })[0]).toHaveAttribute('tabindex', '-1')
      );
      expect(screen.getAllByRole('button', { name: 'Row action' })[0]).toHaveAttribute(
        'tabindex',
        '-1'
      );
    });

    it('closes the expanded cell with Escape while the cell still has focus', async () => {
      render(<TanStackDatatableGrid {...defaultProps} />);
      const cell = getCell('a1');
      cell.focus();
      await userEvent.keyboard('{Enter}');
      expect(await screen.findByTestId('euiDataGridExpansionPopover')).toBeInTheDocument();

      // Focus is on the cell, as before the focus trap moved it into the popover.
      act(() => cell.focus());
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(screen.queryByTestId('euiDataGridExpansionPopover')).not.toBeInTheDocument()
      );
    });

    it('still expands cells without interactive content with Enter', async () => {
      render(<TanStackDatatableGrid {...defaultProps} />);
      getCell('a1').focus();
      await userEvent.keyboard('{Enter}');
      expect(await screen.findByTestId('euiDataGridExpansionPopover')).toBeInTheDocument();
    });
  });

  describe('announcements', () => {
    const pagination = (pageIndex: number) => ({
      pageIndex,
      pageSize: 10,
      onChangePage: jest.fn(),
      onChangeItemsPerPage: jest.fn(),
    });

    it('announces nothing initially', () => {
      render(
        <TanStackDatatableGrid
          {...defaultProps}
          sorting={{ columns: [{ id: 'a', direction: 'asc' }], onSort: jest.fn() }}
        />
      );
      expect(screen.queryByText(/Sorted by/)).not.toBeInTheDocument();
    });

    it('announces changes of the sorting', async () => {
      const onSort = jest.fn();
      const { rerender } = render(
        <TanStackDatatableGrid {...defaultProps} sorting={{ columns: [], onSort }} />
      );
      rerender(
        <TanStackDatatableGrid
          {...defaultProps}
          sorting={{ columns: [{ id: 'a', direction: 'desc' }], onSort }}
        />
      );
      expect(await screen.findByText('Sorted by Column A, descending')).toBeInTheDocument();

      rerender(<TanStackDatatableGrid {...defaultProps} sorting={{ columns: [], onSort }} />);
      expect(await screen.findByText('Sorting removed')).toBeInTheDocument();
    });

    it('announces page changes', async () => {
      const { rerender } = render(
        <TanStackDatatableGrid {...defaultProps} rowCount={25} pagination={pagination(0)} />
      );
      rerender(
        <TanStackDatatableGrid {...defaultProps} rowCount={25} pagination={pagination(2)} />
      );
      // The live region alternates between two elements, either of them holds the message.
      expect(
        await screen.findAllByText('Page 3 of 3', { selector: '[role="status"]' })
      ).not.toHaveLength(0);
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
