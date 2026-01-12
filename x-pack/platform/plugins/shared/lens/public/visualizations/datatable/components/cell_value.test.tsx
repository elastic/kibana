/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { DataContext } from './table_basic';
import { createGridCell } from './cell_value';
import { getTransposeId } from '@kbn/transpose-utils';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DatatableArgs } from '../../../../common/expressions';
import type { DataContextType } from './types';
import { render, screen } from '@testing-library/react';

describe('datatable cell renderer', () => {
  const innerCellColorFnMock = jest.fn().mockReturnValue('blue');
  const cellColorFnMock = jest.fn().mockReturnValue(innerCellColorFnMock);
  const setCellProps = jest.fn();

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
  const CellRenderer = createGridCell(
    {
      a: { convert: (x) => `formatted ${x}` } as FieldFormat,
    },
    { columns: [], sortingColumnId: '', sortingDirection: 'none' },
    DataContext,
    false,
    cellColorFnMock
  );

  afterEach(() => {
    jest.clearAllMocks();
  });

  const DataContextProviderWrapper =
    (wrapperProps?: Partial<DataContextType>) =>
    ({ children }: { children: React.ReactNode }) => {
      return (
        <DataContext.Provider
          value={{
            table,
            alignments: new Map([['a', 'right']]),
            ...wrapperProps,
          }}
        >
          {children}
        </DataContext.Provider>
      );
    };
  const renderCellRenderer = () => {
    const rtlRender = render(
      <CellRenderer
        rowIndex={0}
        colIndex={0}
        columnId="a"
        setCellProps={setCellProps}
        isExpandable={false}
        isDetails={false}
        isExpanded={false}
      />,
      { wrapper: DataContextProviderWrapper() }
    );
    return { ...rtlRender };
  };

  it('renders formatted value', () => {
    renderCellRenderer();
    expect(screen.getByText('formatted 123')).toHaveTextContent('formatted 123');
  });

  it('set class with text alignment', () => {
    renderCellRenderer();
    expect(screen.getByText('formatted 123')).toHaveClass('lnsTableCell--right');
  });

  it('does not set multiline class for regular height tables', () => {
    renderCellRenderer();
    expect(screen.getByText('formatted 123')).not.toHaveClass('lnsTableCell--multiline');
  });

  it('set multiline class for auto height tables', () => {
    const MultiLineCellRenderer = createGridCell(
      {
        a: { convert: (x) => `formatted ${x}` } as FieldFormat,
      },
      { columns: [], sortingColumnId: '', sortingDirection: 'none' },
      DataContext,
      false,
      cellColorFnMock,
      true
    );
    render(
      <MultiLineCellRenderer
        rowIndex={0}
        colIndex={0}
        columnId="a"
        setCellProps={setCellProps}
        isExpandable={false}
        isDetails={false}
        isExpanded={false}
      />,
      { wrapper: DataContextProviderWrapper() }
    );

    expect(screen.getByText('formatted 123')).toHaveClass('lnsTableCell--multiline');
  });

  it('renders as button if oneClickFilter is set', () => {
    const MultiLineCellRenderer = createGridCell(
      {
        a: { convert: (x) => `formatted ${x}` } as FieldFormat,
      },
      {
        columns: [
          {
            columnId: 'a',
            type: 'lens_datatable_column',
            oneClickFilter: true,
          },
        ],
        sortingColumnId: '',
        sortingDirection: 'none',
      },
      DataContext,
      false,
      cellColorFnMock,
      true
    );
    render(
      <MultiLineCellRenderer
        rowIndex={0}
        colIndex={0}
        columnId="a"
        setCellProps={setCellProps}
        isExpandable={false}
        isDetails={false}
        isExpanded={false}
      />,
      { wrapper: DataContextProviderWrapper({ handleFilterClick: () => {} }) }
    );
    expect(screen.getByRole('button')).toHaveTextContent('formatted 123');
  });

  describe('dynamic coloring', () => {
    function getCellRenderer(columnConfig: DatatableArgs) {
      return createGridCell(
        {
          a: { convert: (x) => `formatted ${x}` } as FieldFormat,
        },
        columnConfig,
        DataContext,
        false,
        cellColorFnMock
      );
    }
    function getColumnConfiguration(): DatatableArgs {
      return {
        title: 'myData',
        columns: [
          {
            columnId: 'a',
            colorMode: 'none',
            palette: {
              type: 'palette',
              name: 'custom',
              params: {
                colors: ['#aaa', '#bbb', '#ccc', '#ddd', '#eee'],
                gradient: false,
                stops: [20, 40, 60, 80, 100],
                range: 'percent',
                rangeMin: 0,
                rangeMax: 100,
              },
            },
            type: 'lens_datatable_column',
          },
        ],
        sortingColumnId: '',
        sortingDirection: 'none',
        rowHeightLines: 1,
      };
    }

    function renderCellComponent(
      columnConfig = getColumnConfiguration(),
      context: Partial<DataContextType> = {}
    ) {
      const CellRendererWithPalette = getCellRenderer(columnConfig);

      const rtlRender = render(
        <CellRendererWithPalette
          rowIndex={0}
          colIndex={0}
          columnId={columnConfig.columns[0].columnId}
          setCellProps={setCellProps}
          isExpandable={false}
          isDetails={false}
          isExpanded={false}
        />,
        {
          wrapper: DataContextProviderWrapper({
            table,
            minMaxByColumnId: new Map([['a', { min: 12, max: 155 }]]),
            ...context,
          }),
        }
      );
      return { ...rtlRender };
    }

    it('ignores coloring when colorMode is set to "none"', () => {
      renderCellComponent();
      expect(setCellProps).not.toHaveBeenCalled();
    });

    it('should set the coloring of the cell when enabled', () => {
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';

      renderCellComponent(columnConfig, {});

      expect(setCellProps).toHaveBeenCalledWith({
        style: expect.objectContaining({ backgroundColor: 'blue' }),
      });
    });

    it('should call getCellColor with full columnId of transpose column', () => {
      const columnId = getTransposeId('test', 'a');
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';
      columnConfig.columns[0].columnId = columnId;

      renderCellComponent(columnConfig, {
        table: {
          ...table,
          columns: [
            {
              ...table.columns[0],
              id: columnId,
            },
          ],
        },
      });

      expect(cellColorFnMock.mock.calls[0][0]).toBe(columnId);
    });

    it('should set the coloring of the text when enabled', () => {
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'text';

      renderCellComponent(columnConfig, {});

      expect(setCellProps).toHaveBeenCalledWith({
        style: expect.objectContaining({ color: 'blue' }),
      });
    });

    it('should not color the cell when color function returns null', () => {
      setCellProps.mockClear();
      innerCellColorFnMock.mockReturnValueOnce(null);
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';

      renderCellComponent(columnConfig, {});

      expect(setCellProps).not.toHaveBeenCalled();
    });

    it('should not color the cell when color function returns empty string', () => {
      innerCellColorFnMock.mockReturnValueOnce('');
      const columnConfig = getColumnConfiguration();
      columnConfig.columns[0].colorMode = 'cell';

      renderCellComponent(columnConfig, {});

      expect(setCellProps).not.toHaveBeenCalled();
    });
  });

  describe('one click filter with background color', () => {
    const handleFilterClick = jest.fn();

    const renderThemedCellRenderer = (
      columnConfig: DatatableArgs,
      isDarkMode: boolean,
      backgroundColor: string | null
    ) => {
      innerCellColorFnMock.mockReturnValue(backgroundColor);
      const CellRendererWithColor = createGridCell(
        {
          a: { convert: (x) => `formatted ${x}` } as FieldFormat,
        },
        columnConfig,
        DataContext,
        isDarkMode,
        cellColorFnMock
      );

      render(
        <EuiThemeProvider colorMode={isDarkMode ? 'dark' : 'light'}>
          <CellRendererWithColor
            rowIndex={0}
            colIndex={0}
            columnId="a"
            setCellProps={setCellProps}
            isExpandable={false}
            isDetails={false}
            isExpanded={false}
          />
        </EuiThemeProvider>,
        {
          wrapper: DataContextProviderWrapper({
            handleFilterClick,
            table,
          }),
        }
      );
    };

    const columnConfig: DatatableArgs = {
      title: 'myData',
      columns: [
        {
          columnId: 'a',
          type: 'lens_datatable_column',
          oneClickFilter: true,
          colorMode: 'cell',
        },
      ],
      sortingColumnId: '',
      sortingDirection: 'none',
    };

    it('should adjust link color for dark background in light mode', () => {
      const backgroundColor = '#000000';
      const expectedColor = '#4b78c9';
      const isDarkMode = false;
      renderThemedCellRenderer(columnConfig, isDarkMode, backgroundColor);

      expect(screen.getByRole('button')).toHaveStyle(`color: ${expectedColor}`);
    });

    it('should adjust link color for light background in dark mode', () => {
      const backgroundColor = '#FFFFFF';
      const expectedColor = '#1750BA';
      const isDarkMode = true;
      renderThemedCellRenderer(columnConfig, isDarkMode, backgroundColor);

      expect(screen.getByRole('button')).toHaveStyle(`color: ${expectedColor}`);
    });

    it('should not adjust link color when there is no background color', () => {
      const isDarkMode = false;
      renderThemedCellRenderer(columnConfig, isDarkMode, null);
      const linkColor = '#1750BA';
      expect(screen.getByRole('button')).toHaveStyle(`color: ${linkColor}`);
    });

    it('should not adjust link color when colorMode is none', () => {
      const backgroundColor = '#FF0000'; // A distinct background color
      const isDarkMode = false;
      const columnConfigNonCellColorMode: DatatableArgs = {
        ...columnConfig,
        columns: [
          {
            ...columnConfig.columns[0],
            colorMode: 'none',
          },
        ],
      };
      renderThemedCellRenderer(columnConfigNonCellColorMode, isDarkMode, backgroundColor);
      const linkColor = '#1750BA'; // Default EuiLink color for light mode
      expect(screen.getByRole('button')).toHaveStyle(`color: ${linkColor}`);
    });

    it('should not adjust link color when colorMode is text', () => {
      const backgroundColor = '#FF0000'; // A distinct background color
      const isDarkMode = false;
      const columnConfigNonCellColorMode: DatatableArgs = {
        ...columnConfig,
        columns: [
          {
            ...columnConfig.columns[0],
            colorMode: 'text',
          },
        ],
      };
      renderThemedCellRenderer(columnConfigNonCellColorMode, isDarkMode, backgroundColor);
      const linkColor = '#1750BA'; // Default EuiLink color for light mode
      expect(screen.getByRole('button')).toHaveStyle(`color: ${linkColor}`);
    });
  });
});
