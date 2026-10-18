/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
      expect(within(screen.getByRole('row', { name: /Column A/ })).getByText('Column A')).toBe(
        document.activeElement
      );
    });
  });
});
