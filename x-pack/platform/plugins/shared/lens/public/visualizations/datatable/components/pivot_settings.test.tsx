/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { DatatableVisualizationState } from '@kbn/lens-common';
import { PivotSettings } from './pivot_settings';

describe('PivotSettings', () => {
  let defaultState: DatatableVisualizationState;
  let setState: jest.Mock;

  beforeEach(() => {
    setState = jest.fn();
    defaultState = {
      layerId: 'layer1',
      layerType: 'data',
      columns: [
        {
          columnId: 'col1',
          isTransposed: false,
        },
        {
          columnId: 'col2',
          isTransposed: false,
        },
      ],
    };
  });

  it('should show enable pivot message when no columns are transposed', () => {
    render(<PivotSettings state={defaultState} setState={setState} />);

    expect(screen.getByText(/Enable pivot table/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag fields to "Split metrics by" to create a pivot table/i)).toBeInTheDocument();
  });

  it('should show pivot settings when pivot mode is enabled', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'col1',
          isTransposed: true,
          transposeDimension: 'columns' as const,
        },
        {
          columnId: 'col2',
          isTransposed: false,
        },
      ],
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    expect(screen.getByText(/Pivot table options/i)).toBeInTheDocument();
    expect(screen.getByTestId('lnsDatatable_pivot_row_totals')).toBeInTheDocument();
    expect(screen.getByTestId('lnsDatatable_pivot_column_totals')).toBeInTheDocument();
    expect(screen.getByTestId('lnsDatatable_pivot_empty_cells')).toBeInTheDocument();
    expect(screen.getByTestId('lnsDatatable_pivot_max_columns')).toBeInTheDocument();
  });

  it('should toggle row totals', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'col1',
          isTransposed: true,
          transposeDimension: 'columns' as const,
        },
      ],
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    const rowTotalsSwitch = screen.getByTestId('lnsDatatable_pivot_row_totals');
    fireEvent.click(rowTotalsSwitch);

    expect(setState).toHaveBeenCalledWith({
      ...pivotState,
      grandTotals: {
        rows: true,
        columns: false,
        position: 'bottom',
        functions: ['sum'],
      },
    });
  });

  it('should toggle column totals', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'col1',
          isTransposed: true,
          transposeDimension: 'columns' as const,
        },
      ],
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    const columnTotalsSwitch = screen.getByTestId('lnsDatatable_pivot_column_totals');
    fireEvent.click(columnTotalsSwitch);

    expect(setState).toHaveBeenCalledWith({
      ...pivotState,
      grandTotals: {
        rows: false,
        columns: true,
        position: 'bottom',
        functions: ['sum'],
      },
    });
  });

  it('should update empty cells setting', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'col1',
          isTransposed: true,
          transposeDimension: 'columns' as const,
        },
      ],
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    const emptyCellsSelect = screen.getByTestId('lnsDatatable_pivot_empty_cells');
    fireEvent.change(emptyCellsSelect, { target: { value: 'zero' } });

    expect(setState).toHaveBeenCalledWith({
      ...pivotState,
      pivotSettings: {
        emptyCells: 'zero',
      },
    });
  });

  it('should update max columns setting', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'col1',
          isTransposed: true,
          transposeDimension: 'columns' as const,
        },
      ],
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    const maxColumnsInput = screen.getByTestId('lnsDatatable_pivot_max_columns');
    fireEvent.change(maxColumnsInput, { target: { value: '50' } });

    expect(setState).toHaveBeenCalledWith({
      ...pivotState,
      pivotSettings: {
        maxColumns: 50,
      },
    });
  });

  it('should not update max columns if value is out of range', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'col1',
          isTransposed: true,
          transposeDimension: 'columns' as const,
        },
      ],
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    const maxColumnsInput = screen.getByTestId('lnsDatatable_pivot_max_columns');

    // Test below minimum
    fireEvent.change(maxColumnsInput, { target: { value: '5' } });
    expect(setState).not.toHaveBeenCalled();

    // Test above maximum
    fireEvent.change(maxColumnsInput, { target: { value: '2000' } });
    expect(setState).not.toHaveBeenCalled();
  });

  it('should display estimated column information', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'bucket1',
          isTransposed: false,
          isMetric: false,
        },
        {
          columnId: 'bucket2',
          isTransposed: true,
          transposeDimension: 'columns' as const,
          isMetric: false,
        },
        {
          columnId: 'metric1',
          isTransposed: false,
          isMetric: true,
        },
      ],
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    // Should show pivot structure information
    expect(screen.getByText(/Pivot structure/i)).toBeInTheDocument();
    expect(screen.getByText(/dynamic columns based on data/i)).toBeInTheDocument();
  });

  it('should respect existing grandTotals state when toggling', () => {
    const pivotState = {
      ...defaultState,
      columns: [
        {
          columnId: 'col1',
          isTransposed: true,
          transposeDimension: 'columns' as const,
        },
      ],
      grandTotals: {
        rows: true,
        columns: false,
        position: 'top' as const,
        functions: ['avg'] as const,
      },
    };

    render(<PivotSettings state={pivotState} setState={setState} />);

    const columnTotalsSwitch = screen.getByTestId('lnsDatatable_pivot_column_totals');
    fireEvent.click(columnTotalsSwitch);

    expect(setState).toHaveBeenCalledWith({
      ...pivotState,
      grandTotals: {
        rows: true,
        columns: true,
        position: 'top',
        functions: ['avg'],
      },
    });
  });
});
