/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { coreMock } from '@kbn/core/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { DatatableComponent } from './table_basic';
import type { DatatableProps } from '../../../../common/expressions';
import type { DatatableRenderProps } from './types';
import { getLensFeatureFlagDefaults } from '../../../../common';
import { getLensFeatureFlags } from '../../../get_feature_flags';

jest.mock('../../../get_feature_flags', () => ({ getLensFeatureFlags: jest.fn() }));

const { theme: setUpMockTheme } = coreMock.createSetup();

const indexPatternId = 'indexPatternId';

const getData = (): Datatable => ({
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
      id: 'c',
      name: 'c',
      meta: {
        type: 'number',
        source: 'esaggs',
        field: 'c',
        sourceParams: { indexPatternId, type: 'count' },
      },
    },
  ],
  rows: [
    { a: 'shoes', c: 3 },
    { a: 'hats', c: 1 },
    { a: 'coats', c: 2 },
  ],
});

const getArgs = (): DatatableProps['args'] => ({
  title: 'My table',
  columns: [
    { columnId: 'a', type: 'lens_datatable_column' },
    { columnId: 'c', type: 'lens_datatable_column' },
  ],
  sortingColumnId: '',
  sortingDirection: 'none',
  rowHeightLines: 1,
});

describe('DatatableComponent with @kbn/data-grid', () => {
  let onDispatchEvent: jest.Mock;
  let renderComplete: jest.Mock;
  let data: Datatable;
  let args: DatatableProps['args'];
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  beforeAll(() => {
    // jsdom has no layout: give the grid a size, so it renders its rows and columns.
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.mocked(getLensFeatureFlags).mockReturnValue({
      ...getLensFeatureFlagDefaults(),
      enableTanstackDatatable: true,
    });
    onDispatchEvent = jest.fn();
    renderComplete = jest.fn();
    data = getData();
    args = getArgs();
  });

  const renderTable = (propsOverrides: Partial<DatatableRenderProps> = {}) => {
    const props: DatatableRenderProps = {
      data,
      args,
      formatFactory: () => ({ convertToText: (x) => x, convertToReact: (x) => x } as IFieldFormat),
      dispatchEvent: onDispatchEvent,
      getType: jest.fn().mockReturnValue({ type: 'buckets' }),
      paletteService: chartPluginMock.createPaletteRegistry(),
      theme: setUpMockTheme,
      interactive: true,
      viewMode: 'view',
      syncColors: false,
      renderComplete,
      ...propsOverrides,
    };
    return render(<DatatableComponent {...props} />, { wrapper: I18nProvider });
  };

  const getRowCellTexts = () =>
    screen
      .getAllByRole('gridcell')
      .filter((cell) => !cell.closest('[data-test-subj^="dataGridFooterCell"]'))
      .map((cell) => cell.textContent);

  it('renders the table with @kbn/data-grid when the feature flag is enabled', () => {
    renderTable();
    expect(screen.getByRole('grid', { name: 'My table' })).toHaveAttribute(
      'data-test-subj',
      'lnsDataTableGrid'
    );
    expect(getRowCellTexts()).toEqual(['shoes', '3', 'hats', '1', 'coats', '2']);
  });

  it('renders the EuiDataGrid when the feature flag is disabled', () => {
    jest.mocked(getLensFeatureFlags).mockReturnValue(getLensFeatureFlagDefaults());
    renderTable();
    expect(screen.getByTestId('lnsDataTable')).toBeInTheDocument();
    expect(screen.queryByTestId('lnsDataTableGrid')).not.toBeInTheDocument();
  });

  it('signals that rendering is complete once the grid rendered its rows', () => {
    jest.useFakeTimers();
    try {
      renderTable();
      expect(renderComplete).not.toHaveBeenCalled();
      // A frame later, not after the 300ms timeout used for EuiDataGrid.
      act(() => {
        jest.advanceTimersByTime(20);
      });
      expect(renderComplete).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('signals that rendering is complete for an empty table', async () => {
    data.rows = [];
    renderTable();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    await waitFor(() => expect(renderComplete).toHaveBeenCalled());
  });

  it('hides hidden columns', () => {
    args.columns[1] = { ...args.columns[1], hidden: true };
    renderTable();
    expect(screen.queryByTestId('dataGridHeaderCell-c')).not.toBeInTheDocument();
    expect(getRowCellTexts()).toEqual(['shoes', 'hats', 'coats']);
  });

  it('renders the header menu with the Lens actions and sort labels', async () => {
    args.columns[0] = { ...args.columns[0], width: 240 };
    renderTable();
    await user.click(screen.getByTestId('dataGridHeaderCellActionButton-a'));
    const menu = await screen.findByTestId('dataGridHeaderCellActionGroup-a');
    expect(within(menu).getByTestId('lensDatatableResetWidth')).toBeEnabled();
    expect(within(menu).getByTestId('lensDatatableHide')).toBeInTheDocument();
    expect(within(menu).getByText('Sort ascending')).toBeInTheDocument();
    expect(within(menu).getByText('Sort descending')).toBeInTheDocument();
  });

  it('disables resetting the width of a column without a width', async () => {
    renderTable();
    await user.click(screen.getByTestId('dataGridHeaderCellActionButton-a'));
    const menu = await screen.findByTestId('dataGridHeaderCellActionGroup-a');
    expect(within(menu).getByTestId('lensDatatableResetWidth')).toBeDisabled();
  });

  it('persists sorting and hiding through edit events', async () => {
    renderTable();

    await user.click(screen.getByTestId('dataGridHeaderCellActionButton-a'));
    await user.click(await screen.findByTestId('gridSortDescendingButton'));
    expect(onDispatchEvent).toHaveBeenLastCalledWith({
      name: 'edit',
      data: { action: 'sort', columnId: 'a', direction: 'desc' },
    });

    await user.click(screen.getByTestId('dataGridHeaderCellActionButton-c'));
    await user.click(
      within(await screen.findByTestId('dataGridHeaderCellActionGroup-c')).getByTestId(
        'lensDatatableHide'
      )
    );
    expect(onDispatchEvent).toHaveBeenLastCalledWith({
      name: 'edit',
      data: { action: 'toggle', columnId: 'c' },
    });
  });

  it('renders the rows in the configured sort order', () => {
    args.sortingColumnId = 'c';
    args.sortingDirection = 'asc';
    renderTable();
    expect(getRowCellTexts()).toEqual(['hats', '1', 'coats', '2', 'shoes', '3']);
    expect(screen.getByTestId('dataGridHeaderCell-c')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('dispatches a filter event from the expanded cell', async () => {
    renderTable({ columnFilterable: [true, true] });
    screen.getByText('hats').closest<HTMLElement>('[role="gridcell"]')?.focus();
    await user.keyboard('{Enter}');
    await user.click(await screen.findByTestId('lensDatatableFilterOut'));
    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: { data: [{ column: 0, row: 1, table: data, value: 'hats' }], negate: true },
    });
  });

  it('explains in the expanded cell why a column cannot be filtered', async () => {
    renderTable({ columnFilterable: [false, false] });
    screen.getByText('hats').closest<HTMLElement>('[role="gridcell"]')?.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByTestId('lensDatatableCellPopoverMessage')).toBeInTheDocument();
    expect(screen.getByTestId('lensDatatableFilterFor')).toBeDisabled();
  });

  it('does not offer interactions in non-interactive mode', () => {
    renderTable({
      columnFilterable: [true, true],
      viewMode: 'non-interactive',
      interactive: false,
    });
    expect(screen.queryByTestId('dataGridHeaderCellActionButton-a')).not.toBeInTheDocument();
    expect(screen.getByTestId('dataGridHeaderCell-a')).not.toHaveAttribute('aria-sort');
  });

  it('renders the summary row in the footer of the grid', () => {
    args.columns[1] = {
      ...args.columns[1],
      summaryRow: 'sum',
      summaryLabel: 'Sum',
      summaryRowValue: 6,
    };
    renderTable();
    const footerCell = screen.getByTestId('dataGridFooterCell-c');
    expect(footerCell).toHaveAttribute('role', 'gridcell');
    expect(within(footerCell).getByTestId('lnsDataTable-footer-c')).toHaveTextContent('Sum: 6');
    expect(screen.getByRole('grid')).toHaveAttribute('aria-rowcount', '5');
  });

  it('renders row numbers and the row actions column with named headers', () => {
    args.showRowNumbers = true;
    renderTable({ rowHasRowClickTriggerActions: [true, true, true] });
    expect(screen.getAllByTestId('lnsDataTable-rowNumber').map((cell) => cell.textContent)).toEqual(
      ['1', '2', '3']
    );
    expect(screen.getAllByRole('button', { name: 'Show actions' })).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: 'Row number' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Row actions' })).toBeInTheDocument();
  });

  it('dispatches the row context menu event from the row actions', async () => {
    renderTable({ rowHasRowClickTriggerActions: [true, true, true] });
    await user.click(screen.getAllByRole('button', { name: 'Show actions' })[1]);
    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'tableRowContextMenuClick',
      data: expect.objectContaining({ rowIndex: 1 }),
    });
  });

  it('paginates and persists the page size', async () => {
    data.rows = Array.from({ length: 13 }, (_, i) => ({ a: `row-${i}`, c: i }));
    args.pageSize = 10;
    args.showRowNumbers = true;
    renderTable();
    expect(screen.getByText('row-0')).toBeInTheDocument();
    expect(screen.queryByText('row-10')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('pagination-button-next'));
    expect(screen.getByText('row-10')).toBeInTheDocument();
    expect(screen.queryByText('row-0')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('tablePaginationPopoverButton'));
    await user.click(await screen.findByTestId('tablePagination-20-rows'));
    expect(onDispatchEvent).toHaveBeenLastCalledWith({
      name: 'edit',
      data: { action: 'pagesize', size: 20 },
    });
  });

  it('clamps the rows to the configured number of lines', () => {
    args.rowHeightLines = 3;
    renderTable();
    expect(screen.getByRole('grid')).toHaveAttribute('data-row-height', 'lines');
  });

  it('lets the rows grow with their content', () => {
    args.fitRowToContent = true;
    renderTable();
    expect(screen.getByRole('grid')).toHaveAttribute('data-row-height', 'auto');
  });
});
