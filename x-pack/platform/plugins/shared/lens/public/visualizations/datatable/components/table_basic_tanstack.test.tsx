/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('DatatableComponent with the TanStack grid', () => {
  let onDispatchEvent: jest.Mock;
  let data: Datatable;
  let args: DatatableProps['args'];
  const user = userEvent.setup({ pointerEventsCheck: 0 });

  beforeAll(() => {
    // jsdom has no layout, give the scroll container a size so the virtualizer renders rows.
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
    // jsdom has no PointerEvent: fall back to a MouseEvent, which carries the coordinates.
    Object.defineProperty(window, 'PointerEvent', { value: MouseEvent, configurable: true });
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

  let renderComplete: jest.Mock;

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

  const getCellTexts = () => screen.getAllByRole('gridcell').map((cell) => cell.textContent);

  it('renders the table with the TanStack grid when the feature flag is enabled', () => {
    renderTable();
    expect(screen.getByRole('grid', { name: 'My table' })).toBeInTheDocument();
    expect(screen.getByTestId('lnsDataTable')).toBeInTheDocument();
    expect(getCellTexts()).toEqual(['shoes', '3', 'hats', '1', 'coats', '2']);
  });

  it('signals that rendering is complete when the grid has rendered its rows', async () => {
    renderTable();
    await waitFor(() => expect(renderComplete).toHaveBeenCalled());
  });

  it('signals that rendering is complete for an empty table', async () => {
    data.rows = [];
    renderTable();
    await waitFor(() => expect(renderComplete).toHaveBeenCalled());
  });

  it('renders the EuiDataGrid when the feature flag is disabled', () => {
    jest.mocked(getLensFeatureFlags).mockReturnValue(getLensFeatureFlagDefaults());
    renderTable();
    expect(screen.queryByTestId('lnsTanStackGridCellContent')).not.toBeInTheDocument();
    expect(screen.getByTestId('lnsDataTable')).toBeInTheDocument();
  });

  it('renders the empty placeholder without rows', () => {
    data.rows = [];
    renderTable();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.getByTestId('lnsVisualizationContainer')).toBeInTheDocument();
  });

  it('hides hidden columns and uses the configured column width', () => {
    args.columns[1] = { ...args.columns[1], hidden: true };
    args.columns[0] = { ...args.columns[0], width: 240 };
    renderTable();
    expect(screen.queryByTestId('dataGridHeaderCell-c')).not.toBeInTheDocument();
    expect(
      screen.getByTestId('lnsDataTable').style.getPropertyValue('--lnsTanStackGridColumnWidth-1')
    ).toBe('240px');
  });

  it('renders the header menu with sort, reset width and hide actions', async () => {
    renderTable();
    await user.click(screen.getByTestId('dataGridHeaderCellActionButton-a'));
    const actions = within(screen.getByRole('dialog'))
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(actions).toEqual(['Sort ascending', 'Sort descending', 'Reset width', 'Hide']);
  });

  it('persists sorting, hiding and resizing through edit events', async () => {
    renderTable();

    await user.click(screen.getByTestId('dataGridHeaderCellActionButton-a'));
    await user.click(screen.getByTestId('dataGridHeaderCellActionSortDesc'));
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
    expect(screen.queryByTestId('dataGridHeaderCell-c')).not.toBeInTheDocument();

    const header = screen.getByTestId('dataGridHeaderCell-a');
    jest.spyOn(header, 'getBoundingClientRect').mockReturnValue({ width: 200 } as DOMRect);
    const handle = screen.getByTestId('dataGridColumnResizer-a');
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(onDispatchEvent).toHaveBeenLastCalledWith({
      name: 'edit',
      data: { action: 'resize', columnId: 'a', width: 250 },
    });
  });

  it('sorts the rows with the configured sorting', () => {
    args.sortingColumnId = 'c';
    args.sortingDirection = 'asc';
    renderTable();
    expect(getCellTexts()).toEqual(['hats', '1', 'coats', '2', 'shoes', '3']);
    expect(screen.getByTestId('dataGridHeaderCell-c')).toHaveAttribute('aria-sort', 'ascending');
  });

  it('dispatches a filter event from the cell actions', async () => {
    renderTable({ columnFilterable: [true, true] });
    screen.getByText('hats').closest<HTMLElement>('[role="gridcell"]')!.focus();
    await user.click(await screen.findByTestId('tanStackCellActionsButton'));
    await user.click(await screen.findByTestId('lensDatatableFilterOut'));
    expect(onDispatchEvent).toHaveBeenCalledWith({
      name: 'filter',
      data: { data: [{ column: 0, row: 1, table: data, value: 'hats' }], negate: true },
    });
  });

  it('disables the filter actions with an explanation for columns that are not filterable', async () => {
    renderTable({ columnFilterable: [false, false] });
    screen.getByText('hats').closest<HTMLElement>('[role="gridcell"]')!.focus();
    await user.click(await screen.findByTestId('tanStackCellActionsButton'));
    expect(await screen.findByTestId('lensDatatableFilterFor')).toBeDisabled();
  });

  it('shows the explanation in the expanded cell popover', async () => {
    renderTable({ columnFilterable: [false, false] });
    const cell = screen.getByText('hats').closest<HTMLElement>('[role="gridcell"]')!;
    cell.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByTestId('lensDatatableCellPopoverMessage')).toBeInTheDocument();
  });

  it('does not offer interactions in non-interactive mode', async () => {
    renderTable({
      columnFilterable: [true, true],
      viewMode: 'non-interactive',
      interactive: false,
    });
    expect(screen.queryByTestId('dataGridHeaderCellActionButton-a')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('separator')).toHaveLength(0);
    screen.getByText('hats').closest<HTMLElement>('[role="gridcell"]')!.focus();
    expect(screen.queryByTestId('lensDatatableFilterOut')).not.toBeInTheDocument();
  });

  it('renders the summary row', () => {
    args.columns[1] = {
      ...args.columns[1],
      summaryRow: 'sum',
      summaryLabel: 'Sum',
      summaryRowValue: 6,
    };
    renderTable();
    expect(screen.getByTestId('lnsDataTable-footer-c')).toHaveTextContent('Sum: 6');
  });

  it('renders row numbers and the row actions column', () => {
    args.showRowNumbers = true;
    renderTable({ rowHasRowClickTriggerActions: [true, true, true] });
    expect(screen.getAllByTestId('lnsDataTable-rowNumber').map((cell) => cell.textContent)).toEqual(
      ['1', '2', '3']
    );
    expect(screen.getAllByRole('button', { name: 'Show actions' })).toHaveLength(3);
  });

  it('paginates and persists the page size', async () => {
    data.rows = Array.from({ length: 13 }, (_, i) => ({ a: `row-${i}`, c: i }));
    args.pageSize = 10;
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
});
