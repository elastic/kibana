/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { ChangePointAnnotation } from '../../components/change_point_detection/change_point_detection_context';
import { useChangePointResults } from '../../components/change_point_detection/use_change_point_agg_request';
import { ChartGridEmbeddableWrapper } from './embeddable_chart_component_wrapper';

jest.mock('@kbn/es-query', () => ({
  buildEsQuery: () => ({ bool: { filter: [] } }),
}));

jest.mock('../../hooks/use_filters_query', () => ({
  useFilterQueryUpdates: () => ({
    filters: [],
    query: { query: '', language: 'kuery' },
    searchBounds: {},
    interval: '1h',
  }),
}));

jest.mock('../../hooks/use_data_source', () => ({
  useDataSource: () => ({ dataView: { timeFieldName: '@timestamp' } }),
}));

jest.mock('../../hooks/use_aiops_app_context', () => ({
  useAiopsAppContext: () => ({ uiSettings: undefined }),
}));

jest.mock('../../components/change_point_detection/use_change_point_agg_request', () => ({
  useChangePointResults: jest.fn(),
}));

jest.mock('../../components/change_point_detection/charts_grid', () => ({
  ChartsGrid: () => null,
}));

const mockUseChangePointResults = jest.mocked(useChangePointResults);

const changePoint: ChangePointAnnotation = {
  id: 'cpu',
  label: 'spike',
  type: 'spike',
  p_value: 0.01,
};

const renderWrapper = (
  props: Partial<React.ComponentProps<typeof ChartGridEmbeddableWrapper>> = {}
) =>
  render(
    <EuiProvider>
      <ChartGridEmbeddableWrapper
        dataViewId="logs-*"
        timeRange={{ from: 'now-15m', to: 'now' }}
        fn="avg"
        metricField="bytes"
        onRenderComplete={jest.fn()}
        onError={jest.fn()}
        parentApi={{}}
        {...props}
      />
    </EuiProvider>
  );

describe('ChartGridEmbeddableWrapper', () => {
  beforeEach(() => {
    mockUseChangePointResults.mockReturnValue({
      results: [],
      isLoading: true,
      isUsingSampleData: false,
      reset: jest.fn(),
      progress: 0,
    });
  });

  it('reports loading once and leaves completion to the charts', () => {
    const onLoading = jest.fn();
    const onRenderComplete = jest.fn();
    const { rerender } = renderWrapper({ onLoading, onRenderComplete });

    mockUseChangePointResults.mockReturnValue({
      results: [changePoint],
      isLoading: false,
      isUsingSampleData: false,
      reset: jest.fn(),
      progress: null,
    });
    rerender(
      <EuiProvider>
        <ChartGridEmbeddableWrapper
          dataViewId="logs-*"
          timeRange={{ from: 'now-15m', to: 'now' }}
          fn="avg"
          metricField="bytes"
          onLoading={onLoading}
          onRenderComplete={onRenderComplete}
          onError={jest.fn()}
          parentApi={{}}
        />
      </EuiProvider>
    );

    expect(onLoading.mock.calls).toEqual([[true]]);
    expect(onRenderComplete).not.toHaveBeenCalled();
  });

  it('renders while loading when onLoading is omitted', () => {
    expect(() => renderWrapper()).not.toThrow();
  });
});
