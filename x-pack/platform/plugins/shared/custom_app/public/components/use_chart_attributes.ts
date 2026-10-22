/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useAsync from 'react-use/lib/useAsync';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { ChartType, getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { AppNodeOfType } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { getServices } from '../services';

const LENS_CHART_TYPES = {
  bar: ChartType.Bar,
  line: ChartType.Line,
  area: ChartType.Area,
  donut: ChartType.Donut,
} as const;

interface ChartAttributes {
  attributes?: TypedLensByValueInput['attributes'];
  error?: Error;
  isLoading: boolean;
}

/**
 * The Lens chart for a query, picked by Lens from the columns the query returns, as Discover
 * does, unless the author chose a type. It follows the query and the shape of its result, not
 * its rows, so a new value of a filter does not rebuild the chart.
 */
export const useChartAttributes = (
  { query, chartType }: Pick<AppNodeOfType<'chart'>, 'query' | 'chartType'>,
  columns: SourceData['columns']
): ChartAttributes => {
  const { lens, dataViews } = getServices();
  // The shape of the result, as text, so that a new result of the same shape is not a change.
  const shape = JSON.stringify(columns.map(({ name, type }) => ({ name, type })));

  const result = useAsync(async () => {
    const [helpers, dataView] = await Promise.all([
      lens.stateHelperApi(),
      getESQLAdHocDataview({
        dataViewsService: dataViews,
        query,
        options: { skipFetchFields: true },
      }),
    ]);
    const textBasedColumns = (JSON.parse(shape) as Array<{ name: string; type: string }>).map(
      ({ name, type }) =>
        ({
          id: name,
          name,
          meta: { type: esFieldTypeToKibanaFieldType(type) },
        } as DatatableColumn)
    );
    const [suggestion] =
      helpers.suggestions(
        {
          dataViewSpec: dataView.toSpec(),
          fieldName: '',
          textBasedColumns,
          query: { esql: query },
        },
        dataView,
        [],
        chartType ? LENS_CHART_TYPES[chartType] : undefined
      ) ?? [];
    if (!suggestion) {
      throw new Error('No chart fits the columns of this query.');
    }
    return getLensAttributesFromSuggestion({
      filters: [],
      query: { esql: query },
      suggestion,
      dataView,
    }) as TypedLensByValueInput['attributes'];
  }, [lens, dataViews, query, chartType, shape]);

  return useMemo(
    () => ({
      attributes: result.value,
      error: result.error,
      isLoading: result.loading,
    }),
    [result.value, result.error, result.loading]
  );
};
