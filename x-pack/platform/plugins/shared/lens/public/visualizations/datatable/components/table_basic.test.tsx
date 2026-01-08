/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { faker } from '@faker-js/faker';
import { act } from 'react-dom/test-utils';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { DatatableComponent } from './table_basic';
import type { DatatableProps } from '../../../../common/expressions';
import { LENS_EDIT_PAGESIZE_ACTION } from '@kbn/lens-common';
import type { DatatableRenderProps } from './types';
import type { PaletteOutput } from '@kbn/coloring';
import { getTransposeId } from '@kbn/transpose-utils';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import { getCellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';
import { DataGridDensity } from '@kbn/unified-data-table';

jest.mock('../../../shared_components/coloring/get_cell_color_fn', () => {
  const mod = jest.requireActual('../../../shared_components/coloring/get_cell_color_fn');
  return {
    ...mod,
    getCellColorFn: jest.fn(mod.getCellColorFn),
  };
});

const { theme: setUpMockTheme } = coreMock.createSetup();

function sampleArgs() {
  const indexPatternId = 'indexPatternId';
  const data: Datatable = {
    type: 'datatable',
    columns: [
      {
        id: 'a',
        name: 'a',
        meta: {
          type: 'string',
          source: 'esaggs',
          field: 'a',
          sourceParams: { type: 'terms', indexPatternId },
        },
      },
      {
        id: 'b',
        name: 'b',
        meta: {
          type: 'date',
          field: 'b',
          source: 'esaggs',
          sourceParams: {
            type: 'date_histogram',
            indexPatternId,
          },
        },
      },
      {
        id: 'c',
        name: 'c',
        meta: {
          type: 'number',
          source: 'esaggs',
          field: 'c',
          sourceParams: { indexPatternId, type: 'count' },
        },
      },
      {
        id: 'd',
        name: 'd',
        meta: {
          type: 'number',
          source: 'esaggs',
          field: 'd',
          params: { id: 'range' },
          sourceParams: { indexPatternId, type: 'range' },
        },
      },
    ],
    rows: [{ a: 'shoes', b: 1588024800000, c: 3 }],
  };

  const args: DatatableProps['args'] = {
    title: 'My fanci metric chart',
    columns: [
      { columnId: 'a', type: 'lens_datatable_column' },
      { columnId: 'b', type: 'lens_datatable_column' },
      { columnId: 'c', type: 'lens_datatable_column' },
    ],
    sortingColumnId: '',
    sortingDirection: 'none',
    rowHeightLines: 1,
  };

  return { data, args };
}

function copyData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

describe('DatatableComponent', () => {
  let onDispatchEvent: jest.Mock;
  let renderComplete: jest.Mock;

  let { data, args } = sampleArgs();
  beforeEach(() => {
    onDispatchEvent = jest.fn();
    renderComplete = jest.fn();
    const sample = sampleArgs();
    data = sample.data;
    args = sample.args;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderDatatableComponent = (propsOverrides: Partial<DatatableRenderProps> = {}) => {
    const props: DatatableRenderProps = {
      data,
      args,
      formatFactory: () => ({ convert: (x) => x } as IFieldFormat),
      dispatchEvent: onDispatchEvent,
      getType: jest.fn().mockReturnValue({
        type: 'buckets',
      }),
      paletteService: chartPluginMock.createPaletteRegistry(),
      theme: setUpMockTheme,
      interactive: true,
      syncColors: false,
      renderComplete,
      ...propsOverrides,
    };
    const rtlRender = render(<DatatableComponent {...props} />, { wrapper: I18nProvider });
    return {
      ...rtlRender,
      rerender: (newProps: Partial<DatatableRenderProps>) =>
        rtlRender.rerender(<DatatableComponent {...props} {...newProps} />),
    };
  };

  test('it renders the title and value', () => {
    renderDatatableComponent();
    expect(screen.getByLabelText('My fanci metric chart')).toBeInTheDocument();
    expect(screen.getByRole('row')).toBeInTheDocument();
    expect(screen.queryAllByRole('gridcell').map((cell) => cell.textContent)).toEqual([
      'shoes',
      '1588024800000',
      '3',
    ]);
  });

  test('it renders actions column when there are row actions', () => {
    const rowHasRowClickTriggerActions = [true, true, true];
    renderDatatableComponent({ rowHasRowClickTriggerActions });
    expect(screen.getByRole('button', { name: 'Show actions' })).toBeInTheDocument();
  });
  test('it does not render actions column when there are row actions', () => {
    const rowHasRowClickTriggerActions = [false, false, false];
    renderDatatableComponent({ rowHasRowClickTriggerActions });
    expect(screen.queryByRole('button', { name: 'Show actions' })).not.toBeInTheDocument();
  });

  test('it renders custom row height if set to another value than 1', () => {
    renderDatatableComponent({
      args: {
        ...args,
        rowHeightLines: 5,
      },
    });
    screen.getAllByRole('gridcell').forEach((cell) => {
      expect(cell.firstChild).toHaveClass('euiDataGridRowCell__content--lineCountHeight');
    });
  });

  test('it should render hide, reset, and sort actions on header', async () => {
    renderDatatableComponent();
    await userEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-a'));
    const actionPopover = screen.getByRole('dialog');
    const actions = within(actionPopover)
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(actions).toEqual(['Sort ascending', 'Sort descending', 'Reset width', 'Hide']);
  });

  test('it invokes executeTriggerActions with correct context on click on top value', async () => {
    renderDatatableComponent({ columnFilterable: [true, true, true] });
    await userEvent.hover(screen.getAllByTestId('dataGridRowCell')[0]);
    await userEvent.click(screen.getByTestId('lensDatatableFilterOut'));

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: {
        data: [
          {
            column: 0,
            row: 0,
            table: data,
            value: 'shoes',
          },
        ],
        negate: true,
      },
    });
  });

  test('it invokes executeTriggerActions with correct context on click on timefield', async () => {
    renderDatatableComponent({ columnFilterable: [true, true, true] });
    await userEvent.hover(screen.getAllByTestId('dataGridRowCell')[1]);
    await userEvent.click(screen.getByTestId('lensDatatableFilterFor'));

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: {
        data: [
          {
            column: 1,
            row: 0,
            table: data,
            value: 1588024800000,
          },
        ],
        negate: false,
      },
    });
  });

  test('it invokes executeTriggerActions with correct context on click on timefield from range', async () => {
    const dataWithTimestamp: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: 'a',
          name: 'a',
          meta: {
            type: 'date',
            source: 'esaggs',
            field: 'a',
            sourceParams: { type: 'date_range', indexPatternId: 'a' },
          },
        },
        {
          id: 'b',
          name: 'b',
          meta: {
            type: 'number',
            source: 'esaggs',
            sourceParams: { type: 'count', indexPatternId: 'a' },
          },
        },
      ],
      rows: [{ a: 1588024800000, b: 3 }],
    };

    renderDatatableComponent({
      data: dataWithTimestamp,
      columnFilterable: [true, true, true],
      args: {
        title: '',
        columns: [
          { columnId: 'a', type: 'lens_datatable_column' },
          { columnId: 'b', type: 'lens_datatable_column' },
        ],
        sortingColumnId: '',
        sortingDirection: 'none',
        rowHeightLines: 1,
      },
    });

    await userEvent.hover(screen.getAllByTestId('dataGridRowCell')[0]);
    await userEvent.click(screen.getByTestId('lensDatatableFilterFor'));

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: {
        data: [
          {
            column: 0,
            row: 0,
            table: dataWithTimestamp,
            value: 1588024800000,
          },
        ],
        negate: false,
      },
    });
  });

  test('it should not invoke executeTriggerActions if interactivity is set to false', async () => {
    renderDatatableComponent({ columnFilterable: [true, true, true], interactive: false });
    await userEvent.hover(screen.getAllByTestId('dataGridRowCell')[0]);
    expect(screen.queryByTestId('lensDatatableFilterOut')).not.toBeInTheDocument();
  });

  test('it shows emptyPlaceholder for undefined bucketed data', () => {
    renderDatatableComponent({
      data: {
        ...data,
        rows: [],
      },
    });
    expect(screen.getByTestId('lnsVisualizationContainer')).toHaveTextContent('No results found');
  });

  test('it renders the table with the given sorting', async () => {
    renderDatatableComponent({
      args: {
        ...args,
        sortingColumnId: 'b',
        sortingDirection: 'desc',
      },
    });
    expect(screen.getByTestId('dataGridHeaderCellSortingIcon-b')).toHaveAttribute(
      'data-euiicon-type',
      'sortDown'
    );
    await userEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-b'));
    fireEvent.click(screen.getByRole('button', { name: 'Sort ascending' }));

    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'edit',
      data: {
        action: 'sort',
        columnId: 'b',
        direction: 'asc',
      },
    });
  });

  test('it renders the table with the given sorting in readOnly mode', () => {
    renderDatatableComponent({
      args: {
        ...args,
        sortingColumnId: 'b',
        sortingDirection: 'desc',
      },
    });
    expect(screen.getByTestId('dataGridHeaderCellSortingIcon-b')).toHaveAttribute(
      'data-euiicon-type',
      'sortDown'
    );
  });

  test('it does not render a hidden column', () => {
    renderDatatableComponent({
      args: {
        ...args,
        columns: [
          { columnId: 'a', hidden: true, type: 'lens_datatable_column' },
          { columnId: 'b', type: 'lens_datatable_column' },
          { columnId: 'c', type: 'lens_datatable_column' },
        ],
        sortingColumnId: 'b',
        sortingDirection: 'desc',
      },
    });
    expect(screen.queryAllByRole('gridcell').map((cell) => cell.textContent)).toEqual([
      '1588024800000',
      '3',
    ]);
  });

  test('it adds explicit alignment to context', () => {
    renderDatatableComponent({
      args: {
        ...args,
        columns: [
          { columnId: 'a', alignment: 'center', type: 'lens_datatable_column', colorMode: 'none' },
          { columnId: 'b', alignment: 'center', type: 'lens_datatable_column', colorMode: 'none' },
          { columnId: 'c', alignment: 'center', type: 'lens_datatable_column', colorMode: 'none' },
          { columnId: 'd', alignment: 'center', type: 'lens_datatable_column', colorMode: 'none' },
        ],
      },
    });
    const alignmentsClassNames = screen
      .getAllByTestId('lnsTableCellContent')
      .map((cell) => cell.className);

    expect(alignmentsClassNames).toEqual([
      'lnsTableCell--center', // set via args
      'lnsTableCell--center', // set via args
      'lnsTableCell--center', // set via args
      'lnsTableCell--center', // set via args
    ]);
  });

  test('it adds default alignment data to context', () => {
    renderDatatableComponent({
      args: {
        ...args,
        columns: [
          { columnId: 'a', type: 'lens_datatable_column', colorMode: 'none' },
          { columnId: 'b', type: 'lens_datatable_column', colorMode: 'none' },
          { columnId: 'c', type: 'lens_datatable_column', colorMode: 'none' },
          { columnId: 'd', type: 'lens_datatable_column', colorMode: 'none' },
        ],
        sortingColumnId: 'b',
        sortingDirection: 'desc',
      },
    });
    const alignmentsClassNames = screen
      .getAllByTestId('lnsTableCellContent')
      .map((cell) => cell.className);

    expect(alignmentsClassNames).toEqual([
      'lnsTableCell--left', // default for string
      'lnsTableCell--left', // default for date
      'lnsTableCell--right', // default for number
      'lnsTableCell--left', // default for range
    ]);
  });

  test('it should refresh the table header when the datatable data changes', () => {
    const { rerender } = renderDatatableComponent();
    const newData = copyData(data);
    newData.columns[0].name = 'new a';
    rerender({ data: newData });
    expect(screen.getAllByTestId('dataGridHeader')[0]).toHaveTextContent('new a');
  });

  test('it does render a summary footer if at least one column has it configured', () => {
    renderDatatableComponent({
      args: {
        ...args,
        columns: [
          ...args.columns.slice(0, 2),
          {
            columnId: 'c',
            type: 'lens_datatable_column',
            summaryRow: 'sum',
            summaryLabel: 'Sum',
            summaryRowValue: 3,
          },
        ],
        sortingColumnId: 'b',
        sortingDirection: 'desc',
      },
    });
    expect(screen.queryByTestId('lnsDataTable-footer-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('lnsDataTable-footer-c')).toHaveTextContent('Sum: 3');
  });

  test('it does render a summary footer with just the raw value for empty label', () => {
    renderDatatableComponent({
      args: {
        ...args,
        columns: [
          ...args.columns.slice(0, 2),
          {
            columnId: 'c',
            type: 'lens_datatable_column',
            summaryRow: 'sum',
            summaryLabel: '',
            summaryRowValue: 3,
          },
        ],
        sortingColumnId: 'b',
        sortingDirection: 'desc',
      },
    });
    expect(screen.getByTestId('lnsDataTable-footer-c')).toHaveTextContent('3');
  });

  test('it does not render the summary row if the only column with summary is hidden', () => {
    renderDatatableComponent({
      args: {
        ...args,
        columns: [
          ...args.columns.slice(0, 2),
          {
            columnId: 'c',
            type: 'lens_datatable_column',
            summaryRow: 'sum',
            summaryLabel: '',
            summaryRowValue: 3,
            hidden: true,
          },
        ],
        sortingColumnId: 'b',
        sortingDirection: 'desc',
      },
    });
    expect(screen.queryByTestId('lnsDataTable-footer-c')).not.toBeInTheDocument();
  });

  describe('pagination', () => {
    it('disables pagination by default', async () => {
      renderDatatableComponent();
      expect(screen.queryByTestId('tablePaginationPopoverButton')).not.toBeInTheDocument();
    });

    it('enables pagination', async () => {
      const rowNumbers = 13;
      const pageSize = 4;
      data.rows = new Array(rowNumbers).fill({
        a: 'shoes',
        b: 1588024800000,
        c: faker.number.int(),
      });

      args.pageSize = pageSize;

      const numberOfPages = Math.ceil(rowNumbers / pageSize);

      renderDatatableComponent({
        args,
        data,
      });
      expect(screen.queryByTestId('tablePaginationPopoverButton')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Page 1 of ${numberOfPages}` })).toHaveAttribute(
        'aria-current',
        'page'
      );
      const newIndex = 3;
      await userEvent.click(
        screen.getByRole('link', { name: `Page ${newIndex} of ${numberOfPages}` })
      );
      expect(
        screen.getByRole('button', { name: `Page ${newIndex} of ${numberOfPages}` })
      ).toHaveAttribute('aria-current', 'page');
    });
    it('dynamically toggles pagination', async () => {
      const argsWithoutPagination = copyData(args);
      delete argsWithoutPagination.pageSize;

      const rowNumbers = 13;
      const pageSize = 4;
      data.rows = new Array(rowNumbers).fill({
        a: 'shoes',
        b: 1588024800000,
        c: faker.number.int(),
      });

      args.pageSize = pageSize;

      const { rerender } = renderDatatableComponent({
        args,
        data,
      });
      expect(screen.queryByTestId('tablePaginationPopoverButton')).toBeInTheDocument();
      await act(async () => {
        rerender({ args: argsWithoutPagination });
      });
      expect(screen.queryByTestId('tablePaginationPopoverButton')).not.toBeInTheDocument();
    });

    it('dispatches event when page size changed', async () => {
      args.pageSize = 2;
      data.rows = new Array(20).fill({
        a: 'shoes',
        b: 1588024800000,
        c: faker.number.int(),
      });
      renderDatatableComponent({
        args,
      });
      await userEvent.click(screen.getByTestId('tablePaginationPopoverButton'));
      const sizeToChangeTo = 100;
      fireEvent.click(screen.getByRole('button', { name: `${sizeToChangeTo} rows` }));

      expect(onDispatchEvent).toHaveBeenCalledTimes(1);
      expect(onDispatchEvent).toHaveBeenCalledWith({
        name: 'edit',
        data: {
          action: LENS_EDIT_PAGESIZE_ACTION,
          size: sizeToChangeTo,
        },
      });
    });

    it('doesnt change page position when changing the data to a bigger set', async () => {
      const rowNumbers = 10;
      const pageSize = 2;
      const numberOfPages = Math.ceil(rowNumbers / pageSize);
      data.rows = new Array(rowNumbers).fill({
        a: 'shoes',
        b: 1588024800000,
        c: faker.number.int(),
      });

      args.pageSize = pageSize;

      const { rerender } = renderDatatableComponent({
        args,
        data,
      });
      const newIndex = 3;
      await userEvent.click(
        screen.getByRole('link', { name: `Page ${newIndex} of ${numberOfPages}` })
      );
      expect(
        screen.getByRole('button', { name: `Page ${newIndex} of ${numberOfPages}` })
      ).toHaveAttribute('aria-current', 'page');

      await act(async () => {
        rerender({
          data: {
            ...data,
            rows: new Array(20).fill({ a: 'shoes', b: 1588024800000, c: 3 }),
          },
        });
      });
      const newNumberOfPages = Math.ceil(20 / pageSize);

      // keeps existing page if more data is added
      expect(
        screen.getByRole('button', { name: `Page ${newIndex} of ${newNumberOfPages}` })
      ).toHaveAttribute('aria-current', 'page');
    });

    it('resets page position if rows change so page will be empty', async () => {
      const rowNumbers = 10;
      const pageSize = 2;
      const numberOfPages = Math.ceil(rowNumbers / pageSize);
      data.rows = new Array(rowNumbers).fill({
        a: 'shoes',
        b: 1588024800000,
        c: faker.number.int(),
      });

      args.pageSize = pageSize;

      const { rerender } = renderDatatableComponent({
        args,
        data,
      });
      const newIndex = 3;
      await userEvent.click(
        screen.getByRole('link', { name: `Page ${newIndex} of ${numberOfPages}` })
      );
      expect(
        screen.getByRole('button', { name: `Page ${newIndex} of ${numberOfPages}` })
      ).toHaveAttribute('aria-current', 'page');

      await act(async () => {
        rerender({
          args: {
            ...args,
            pageSize: 2,
          },
          data: {
            ...data,
            rows: new Array(4).fill({ a: 'shoes', b: 1588024800000, c: 3 }),
          },
        });
      });
      // resets to the last page if the current page becomes out of bounds
      expect(screen.getByTestId('euiDataGridBody')).toHaveAttribute(
        'aria-label',
        'My fanci metric chart; Page 2 of 2.'
      );
    });
  });

  describe('renderCellValue', () => {
    describe('getCellColor', () => {
      const palette: PaletteOutput<CustomPaletteState> = {
        type: 'palette',
        name: 'default',
        params: {
          colors: [],
          gradient: false,
          stops: [],
          range: 'number',
          rangeMin: 0,
          rangeMax: 100,
        },
      };

      describe('caching', () => {
        test('caches getCellColorFn by columnId', () => {
          args.columns[0].palette = palette;
          args.columns[0].colorMode = 'cell';
          data.rows.push(
            ...[
              { a: 'pants', b: 1588024800000, c: 4 },
              { a: 'hat', b: 1588024800000, c: 5 },
              { a: 'bag', b: 1588024800000, c: 6 },
            ]
          );

          renderDatatableComponent();

          expect(getCellColorFn).toBeCalledTimes(2); // 2 initial renders of table
        });

        test('caches getCellColorFn by columnId with transpose columns', () => {
          const columnId1 = getTransposeId('a', 'test');
          const columnId2 = getTransposeId('b', 'test');

          renderDatatableComponent({
            data: {
              ...data,
              rows: [{ [columnId1]: 'shoe', [columnId2]: 'hat' }],
              columns: [columnId1, columnId2].map((id) => ({
                ...data.columns[0],
                id,
              })),
            },
            args: {
              ...args,
              columns: [columnId1, columnId2].map((columnId) => ({
                ...args.columns[0],
                palette,
                colorMode: 'cell',
                columnId,
              })),
            },
          });

          expect(getCellColorFn).toBeCalledTimes(2); // 2 initial renders of table
        });
      });

      const color = 'red';

      test('should correctly color numerical values', () => {
        args.columns[0].palette = palette;
        args.columns[0].colorMode = 'cell';

        (getCellColorFn as jest.Mock).mockReturnValue(() => color);

        renderDatatableComponent();

        const cellColors = screen
          .queryAllByRole('gridcell')
          .map((cell) => [cell.textContent, cell.style.backgroundColor]);

        expect(cellColors).toEqual([
          ['shoes', 'red'],
          ['1588024800000', ''],
          ['3', ''],
        ]);
      });

      test('should correctly color string values', () => {
        args.columns[2].palette = palette;
        args.columns[2].colorMode = 'cell';

        (getCellColorFn as jest.Mock).mockReturnValue(() => color);

        renderDatatableComponent();

        const cellColors = screen
          .queryAllByRole('gridcell')
          .map((cell) => [cell.textContent, cell.style.backgroundColor]);

        expect(cellColors).toEqual([
          ['shoes', ''],
          ['1588024800000', ''],
          ['3', 'red'],
        ]);
      });
    });
  });

  describe('gridStyle', () => {
    it('should apply default grid style when density is not provided', () => {
      renderDatatableComponent();
      const table = screen.getByTestId('lnsDataTable');
      expect(table).toHaveClass(/cellPadding-m-fontSize-m/);
    });
    it('should apply normal grid style when density is normal', () => {
      renderDatatableComponent({
        args: {
          ...args,
          density: DataGridDensity.NORMAL,
        },
      });
      const table = screen.getByTestId('lnsDataTable');
      expect(table).toHaveClass(/cellPadding-m-fontSize-m/);
    });
    it('should apply compact grid style when density is compact', () => {
      renderDatatableComponent({
        args: {
          ...args,
          density: DataGridDensity.COMPACT,
        },
      });
      const table = screen.getByTestId('lnsDataTable');
      expect(table).toHaveClass(/cellPadding-s-fontSize-s/);
    });
    it('should apply expanded grid style when density is expanded', () => {
      renderDatatableComponent({
        args: {
          ...args,
          density: DataGridDensity.EXPANDED,
        },
      });
      const table = screen.getByTestId('lnsDataTable');
      expect(table).toHaveClass(/cellPadding-l-fontSize-l/);
    });
    it('should update grid style when density changes', () => {
      const { rerender } = renderDatatableComponent({
        args: {
          ...args,
          density: DataGridDensity.NORMAL,
        },
      });
      const table = screen.getByTestId('lnsDataTable');
      expect(table).toHaveClass(/cellPadding-m-fontSize-m/);
      rerender({
        args: {
          ...args,
          density: DataGridDensity.COMPACT,
        },
      });
      expect(table).toHaveClass(/cellPadding-s-fontSize-s/);
    });
  });

  describe('row numbers', () => {
    it('should show row numbers when enabled', () => {
      renderDatatableComponent({
        args: {
          ...args,
          showRowNumbers: true,
        },
      });

      const rowNumberCells = screen.getAllByTestId('lnsDataTable-rowNumber');
      expect(rowNumberCells).toHaveLength(1);
      expect(rowNumberCells[0]).toHaveTextContent('1');
    });

    it('should not show row numbers when disabled', () => {
      renderDatatableComponent({
        args: {
          ...args,
          showRowNumbers: false,
        },
      });

      expect(screen.queryByRole('gridcell', { name: '' })).not.toBeInTheDocument();
    });

    it('should show correct row numbers with pagination', async () => {
      const rowNumbers = 13;
      const pageSize = 4;
      data.rows = new Array(rowNumbers).fill({
        a: 'shoes',
        b: 1588024800000,
        c: faker.number.int(),
      });

      args.pageSize = pageSize;

      renderDatatableComponent({
        args: {
          ...args,
          showRowNumbers: true,
        },
        data,
      });

      // Page 1
      let rowNumberCells = screen.getAllByTestId('lnsDataTable-rowNumber');
      expect(rowNumberCells.map((cell) => cell.textContent)).toEqual(['1', '2', '3', '4']);

      // Page 2
      await userEvent.click(screen.getByRole('link', { name: `Page 2 of 4` }));
      rowNumberCells = screen.getAllByTestId('lnsDataTable-rowNumber');
      expect(rowNumberCells.map((cell) => cell.textContent)).toEqual(['1', '2', '3', '4']);
    });
  });
});
