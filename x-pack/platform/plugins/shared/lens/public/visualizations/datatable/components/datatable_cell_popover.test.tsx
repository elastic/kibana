/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiDataGridCellPopoverElementProps } from '@elastic/eui';
import { EuiThemeProvider } from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import { MISSING_TOKEN } from '@kbn/field-formats-common';
import { render, screen } from '@testing-library/react';
import { createRenderDatatableCellPopover } from './datatable_cell_popover';

const table: Datatable = {
  type: 'datatable',
  columns: [
    {
      id: 'a',
      name: 'a',
      meta: {
        type: 'number',
      },
    },
  ],
  rows: [{ a: 123 }],
};

const DefaultCellPopover = jest.fn(
  ({ cellActions }: Pick<EuiDataGridCellPopoverElementProps, 'cellActions'>) => (
    <div data-test-subj="defaultCellPopover">{cellActions}</div>
  )
);

const defaultPopoverProps: EuiDataGridCellPopoverElementProps = {
  rowIndex: 0,
  colIndex: 0,
  columnId: 'a',
  setCellPopoverProps: jest.fn(),
  DefaultCellPopover,
  cellActions: <span data-test-subj="cellActions">actions</span>,
  children: <div>children</div>,
  cellContentsElement: document.createElement('div'),
};

const renderCellPopover = (
  params: {
    table?: Datatable;
    columnFilterable?: boolean[];
    popoverProps?: Partial<EuiDataGridCellPopoverElementProps>;
  } = {}
) => {
  const renderPopover = createRenderDatatableCellPopover(
    params.table ?? table,
    params.columnFilterable
  );

  return render(
    <EuiThemeProvider>
      {renderPopover({
        ...defaultPopoverProps,
        ...params.popoverProps,
      })}
    </EuiThemeProvider>
  );
};

describe('createRenderDatatableCellPopover', () => {
  beforeEach(() => {
    DefaultCellPopover.mockClear();
  });

  it('renders cell actions without a message when the column is filterable', () => {
    renderCellPopover({ columnFilterable: [true] });

    expect(screen.getByTestId('cellActions')).toBeInTheDocument();
    expect(screen.queryByTestId('lensDatatableCellPopoverMessage')).not.toBeInTheDocument();
  });

  it('renders a generic disabled message when the column is not filterable', () => {
    renderCellPopover({ columnFilterable: [false] });

    expect(screen.getByTestId('lensDatatableCellPopoverMessage')).toHaveTextContent(
      `You can't apply a filter or drill down from this value.`
    );
    expect(screen.getByTestId('cellActions')).toBeInTheDocument();
  });

  it('renders an ES|QL computed column disabled message when filtering is not allowed', () => {
    const esqlTable: Datatable = {
      ...table,
      meta: { type: ESQL_TABLE_TYPE },
      columns: [{ ...table.columns[0], isComputedColumn: true }],
    };

    renderCellPopover({
      table: esqlTable,
      columnFilterable: [false],
    });

    expect(screen.getByTestId('lensDatatableCellPopoverMessage')).toHaveTextContent(
      `You can't apply a filter or drill down from this value because it relies on a field created at query time.`
    );
  });

  it.each([
    ['null', null],
    ['empty string', ''],
    ['NaN', Number.NaN],
    ['missing token', MISSING_TOKEN],
  ])('hides cell actions for non-colorable values (%s)', (_label, value) => {
    const tableWithNonColorableValue: Datatable = {
      ...table,
      rows: [{ a: value }],
    };

    renderCellPopover({ table: tableWithNonColorableValue });

    expect(DefaultCellPopover).toHaveBeenCalled();
    expect(DefaultCellPopover.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        cellActions: null,
      })
    );
    expect(screen.queryByTestId('lensDatatableCellPopoverMessage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cellActions')).not.toBeInTheDocument();
  });
});
