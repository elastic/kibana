/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PARTITION_CHART_TYPES, SeriesTypes } from '@kbn/lens-common';
import { applyDateHistogramEmptyRowsPolicyToDatasourceState } from './date_histogram_empty_rows_policy';

describe('applyDateHistogramEmptyRowsPolicyToDatasourceState', () => {
  const createDatasourceState = (includeEmptyRows?: boolean) => ({
    currentIndexPatternId: 'logs-*',
    layers: {
      layer1: {
        columnOrder: ['date', 'terms'],
        columns: {
          date: {
            dataType: 'date',
            isBucketed: true,
            label: '@timestamp',
            operationType: 'date_histogram',
            params: {
              interval: 'auto',
              ...(includeEmptyRows === undefined ? {} : { includeEmptyRows }),
            },
            scale: 'interval',
            sourceField: '@timestamp',
          },
          terms: {
            dataType: 'string',
            isBucketed: true,
            label: 'host.name',
            operationType: 'terms',
            params: {
              size: 5,
            },
            scale: 'ordinal',
            sourceField: 'host.name',
          },
        },
        indexPatternId: 'logs-*',
      },
    },
  });

  it('preserves explicit empty rows values for bar chart states', () => {
    const datasourceState = createDatasourceState(true);

    const updatedState = applyDateHistogramEmptyRowsPolicyToDatasourceState(
      datasourceState,
      'lnsXY',
      {
        preferredSeriesType: SeriesTypes.BAR,
      }
    );

    expect(updatedState).toBe(datasourceState);
  });

  it('defaults empty rows off for bar chart states when the param is unset', () => {
    const datasourceState = createDatasourceState();

    const updatedState = applyDateHistogramEmptyRowsPolicyToDatasourceState(
      datasourceState,
      'lnsXY',
      {
        preferredSeriesType: SeriesTypes.BAR,
      }
    );

    expect(updatedState).toEqual({
      ...datasourceState,
      layers: {
        layer1: {
          ...datasourceState.layers.layer1,
          columns: {
            ...datasourceState.layers.layer1.columns,
            date: {
              ...datasourceState.layers.layer1.columns.date,
              params: {
                ...datasourceState.layers.layer1.columns.date.params,
                includeEmptyRows: false,
              },
            },
          },
        },
      },
    });
    expect(datasourceState.layers.layer1.columns.date.params).not.toHaveProperty(
      'includeEmptyRows'
    );
  });

  it('keeps the datasource state reference when the explicit value already matches the policy', () => {
    const datasourceState = createDatasourceState(false);

    const updatedState = applyDateHistogramEmptyRowsPolicyToDatasourceState(
      datasourceState,
      'lnsPie',
      {
        shape: PARTITION_CHART_TYPES.TREEMAP,
      }
    );

    expect(updatedState).toBe(datasourceState);
  });

  it('defaults empty rows on for tables when the param is unset', () => {
    const datasourceState = createDatasourceState();

    const updatedState = applyDateHistogramEmptyRowsPolicyToDatasourceState(
      datasourceState,
      'lnsDatatable',
      {}
    );

    expect(updatedState).toEqual({
      ...datasourceState,
      layers: {
        layer1: {
          ...datasourceState.layers.layer1,
          columns: {
            ...datasourceState.layers.layer1.columns,
            date: {
              ...datasourceState.layers.layer1.columns.date,
              params: {
                ...datasourceState.layers.layer1.columns.date.params,
                includeEmptyRows: true,
              },
            },
          },
        },
      },
    });
  });

  it('leaves non form-based datasource state unchanged', () => {
    expect(
      applyDateHistogramEmptyRowsPolicyToDatasourceState('text based state', 'lnsMetric', {})
    ).toBe('text based state');
  });
});
