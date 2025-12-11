/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSwitch,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiSelect,
  EuiFieldNumber,
  EuiTitle,
} from '@elastic/eui';
import type { DatatableVisualizationState } from '@kbn/lens-common';

interface PivotSettingsProps {
  state: DatatableVisualizationState;
  setState: (newState: DatatableVisualizationState) => void;
}

/**
 * Calculate the estimated number of columns that will be created
 * This is a projection based on the configuration:
 * - Base columns = row dimensions (bucket columns that aren't transposed)
 * - For each column dimension, we'd multiply by its unique values (unknown without data)
 * - For each metric, we create one column per unique value combination
 *
 * Without data, we can only show the number of dimensions and metrics.
 */
function getEstimatedColumnInfo(state: DatatableVisualizationState) {
  const columnDimensions = state.columns.filter(
    (c) => c.isTransposed || c.transposeDimension === 'columns'
  );
  const rowDimensions = state.columns.filter(
    (c) => (!c.isTransposed && !c.isMetric) || c.transposeDimension === 'rows'
  );
  const metrics = state.columns.filter((c) => c.isMetric);

  // Base columns are the row dimensions
  const baseColumns = Math.max(rowDimensions.length, 1);

  // If we have column dimensions and metrics, the actual column count will be:
  // baseColumns + (uniqueValues1 × uniqueValues2 × ... × metrics)
  // But we can't know unique values without data

  return {
    rowDimensions: rowDimensions.length || 0,
    columnDimensions: columnDimensions.length,
    metrics: metrics.length || 1,
    baseColumns,
    hasColumnDimensions: columnDimensions.length > 0,
  };
}

export function PivotSettings({ state, setState }: PivotSettingsProps) {
  const isPivotMode = state.columns.some((c) => c.isTransposed || c.transposeDimension === 'columns');

  const estimatedInfo = getEstimatedColumnInfo(state);

  const onToggleRowTotals = useCallback(() => {
    const currentGrandTotals = state.grandTotals ?? { rows: false, columns: false, position: 'bottom', functions: ['sum'] };
    setState({
      ...state,
      grandTotals: {
        ...currentGrandTotals,
        rows: !currentGrandTotals.rows,
      },
    });
  }, [state, setState]);

  const onToggleColumnTotals = useCallback(() => {
    const currentGrandTotals = state.grandTotals ?? { rows: false, columns: false, position: 'bottom', functions: ['sum'] };
    setState({
      ...state,
      grandTotals: {
        ...currentGrandTotals,
        columns: !currentGrandTotals.columns,
      },
    });
  }, [state, setState]);

  const onEmptyCellsChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'empty' | 'zero' | 'dash' | 'na';
    setState({
      ...state,
      pivotSettings: {
        ...state.pivotSettings,
        emptyCells: value,
      },
    });
  }, [state, setState]);

  const onMaxColumnsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 10 && value <= 1000) {
      setState({
        ...state,
        pivotSettings: {
          ...state.pivotSettings,
          maxColumns: value,
        },
      });
    }
  }, [state, setState]);

  if (!isPivotMode) {
    return (
      <EuiCallOut
        size="s"
        title={i18n.translate('xpack.lens.datatable.pivotSettings.enablePivot', {
          defaultMessage: 'Enable pivot table',
        })}
        iconType="tableDensityNormal"
      >
        <p>
          {i18n.translate('xpack.lens.datatable.pivotSettings.enablePivotDescription', {
            defaultMessage: 'Drag fields to "Split metrics by" to create a pivot table',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <div>
      <EuiTitle size="xxxs">
        <h3>
          {i18n.translate('xpack.lens.datatable.pivotSettings.sectionTitle', {
            defaultMessage: 'Pivot table options',
          })}
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText size="xs" color="subdued">
        <p>
          {estimatedInfo.hasColumnDimensions
            ? i18n.translate('xpack.lens.datatable.pivotSettings.pivotStructure', {
                defaultMessage:
                  'Pivot structure: {baseColumns} base column(s) + ({columnDims} column dimension(s) × {metrics} metric(s)) = dynamic columns based on data',
                values: {
                  baseColumns: estimatedInfo.baseColumns,
                  columnDims: estimatedInfo.columnDimensions,
                  metrics: estimatedInfo.metrics,
                },
              })
            : i18n.translate('xpack.lens.datatable.pivotSettings.standardTable', {
                defaultMessage:
                  'Standard table: {rows} dimension(s) + {metrics} metric(s) = {total} columns',
                values: {
                  rows: estimatedInfo.rowDimensions,
                  metrics: estimatedInfo.metrics,
                  total: estimatedInfo.baseColumns + estimatedInfo.metrics,
                },
              })}
        </p>
        {estimatedInfo.hasColumnDimensions && (
          <p style={{ marginTop: '4px', fontStyle: 'italic' }}>
            {i18n.translate('xpack.lens.datatable.pivotSettings.actualSizeNote', {
              defaultMessage:
                'Actual table size depends on unique values in your data. Row count = combinations of row dimensions.',
            })}
          </p>
        )}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        display="rowCompressed"
        label={i18n.translate('xpack.lens.datatable.pivotSettings.showRowTotals', {
          defaultMessage: 'Show row totals',
        })}
        helpText={i18n.translate('xpack.lens.datatable.pivotSettings.showRowTotalsHelp', {
          defaultMessage: 'Display grand total row at the bottom of the table',
        })}
      >
        <EuiSwitch
          compressed
          showLabel={false}
          label={i18n.translate('xpack.lens.datatable.pivotSettings.showRowTotals', {
            defaultMessage: 'Show row totals',
          })}
          checked={state.grandTotals?.rows ?? false}
          onChange={onToggleRowTotals}
          data-test-subj="lnsDatatable_pivot_row_totals"
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        display="rowCompressed"
        label={i18n.translate('xpack.lens.datatable.pivotSettings.showColumnTotals', {
          defaultMessage: 'Show column totals',
        })}
        helpText={i18n.translate('xpack.lens.datatable.pivotSettings.showColumnTotalsHelp', {
          defaultMessage: 'Display grand total column for all metrics',
        })}
      >
        <EuiSwitch
          compressed
          showLabel={false}
          label={i18n.translate('xpack.lens.datatable.pivotSettings.showColumnTotals', {
            defaultMessage: 'Show column totals',
          })}
          checked={state.grandTotals?.columns ?? false}
          onChange={onToggleColumnTotals}
          data-test-subj="lnsDatatable_pivot_column_totals"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        fullWidth
        display="rowCompressed"
        label={i18n.translate('xpack.lens.datatable.pivotSettings.emptyCells', {
          defaultMessage: 'Empty cells',
        })}
        helpText={i18n.translate('xpack.lens.datatable.pivotSettings.emptyCellsHelp', {
          defaultMessage: 'How to display cells with no data',
        })}
      >
        <EuiSelect
          compressed
          fullWidth
          options={[
            {
              value: 'empty',
              text: i18n.translate('xpack.lens.datatable.pivotSettings.emptyCells.empty', {
                defaultMessage: 'Leave empty',
              }),
            },
            {
              value: 'zero',
              text: i18n.translate('xpack.lens.datatable.pivotSettings.emptyCells.zero', {
                defaultMessage: 'Show as 0',
              }),
            },
            {
              value: 'dash',
              text: i18n.translate('xpack.lens.datatable.pivotSettings.emptyCells.dash', {
                defaultMessage: 'Show as -',
              }),
            },
            {
              value: 'na',
              text: i18n.translate('xpack.lens.datatable.pivotSettings.emptyCells.na', {
                defaultMessage: 'Show as N/A',
              }),
            },
          ]}
          value={state.pivotSettings?.emptyCells ?? 'empty'}
          onChange={onEmptyCellsChange}
          data-test-subj="lnsDatatable_pivot_empty_cells"
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        display="rowCompressed"
        label={i18n.translate('xpack.lens.datatable.pivotSettings.maxColumns', {
          defaultMessage: 'Column limit',
        })}
        helpText={i18n.translate('xpack.lens.datatable.pivotSettings.maxColumnsHelp', {
          defaultMessage: 'Maximum number of columns to create (10-1000)',
        })}
      >
        <EuiFieldNumber
          compressed
          fullWidth
          value={state.pivotSettings?.maxColumns ?? 100}
          onChange={onMaxColumnsChange}
          min={10}
          max={1000}
          data-test-subj="lnsDatatable_pivot_max_columns"
        />
      </EuiFormRow>
    </div>
  );
}
