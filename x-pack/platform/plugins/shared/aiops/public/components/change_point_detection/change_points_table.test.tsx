/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { useDataSource } from '../../hooks/use_data_source';
import type { ChangePointAnnotation } from './change_point_detection_context';
import { useChangePointDetectionContext } from './change_point_detection_context';
import { useCommonChartProps } from './use_common_chart_props';
import { ChangePointsTable } from './change_points_table';

jest.mock('../../hooks/use_aiops_app_context');
jest.mock('../../hooks/use_data_source');
jest.mock('./change_point_detection_context');
jest.mock('./use_common_chart_props');

const chartOnLoad = new Map<string, (isLoading: boolean) => void>();

const buildAnnotation = (id: string, pValue: number): ChangePointAnnotation => ({
  id,
  label: 'dip',
  type: 'dip',
  p_value: pValue,
  group: { name: 'host', value: id },
});

const reportChartLoading = (id: string, isLoading: boolean) => {
  act(() => {
    chartOnLoad.get(`mini_changePointChart_${id}`)?.(isLoading);
  });
};

describe('ChangePointsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chartOnLoad.clear();

    jest.mocked(useAiopsAppContext).mockReturnValue({
      embeddingOrigin: 'dashboard',
      fieldFormats: {
        deserialize: () => ({ convertToText: (v: string) => v ?? '' }),
      },
      data: {
        query: { filterManager: { addFilters: jest.fn() } },
      },
      lens: {
        EmbeddableComponent: ({
          id,
          onLoad,
        }: {
          id: string;
          onLoad?: (isLoading: boolean) => void;
        }) => {
          if (onLoad) {
            chartOnLoad.set(id, onLoad);
          }
          return null;
        },
      },
    } as unknown as ReturnType<typeof useAiopsAppContext>);
    jest.mocked(useDataSource).mockReturnValue({
      dataView: { id: 'logs-*' },
    } as unknown as ReturnType<typeof useDataSource>);
    jest.mocked(useChangePointDetectionContext).mockReturnValue({
      bucketInterval: { expression: '1h' },
    } as unknown as ReturnType<typeof useChangePointDetectionContext>);
    jest.mocked(useCommonChartProps).mockReturnValue({});
  });

  it('reports render complete once every visible preview chart has loaded', () => {
    const onRenderComplete = jest.fn();
    const annotations = [buildAnnotation('a', 0.01), buildAnnotation('b', 0.02)];
    const fieldConfig = { fn: 'avg' as const, metricField: 'bytes', splitField: 'host' };

    const buildTable = () => (
      <I18nProvider>
        <EuiProvider>
          <ChangePointsTable
            isLoading={false}
            annotations={annotations}
            fieldConfig={fieldConfig}
            onRenderComplete={onRenderComplete}
          />
        </EuiProvider>
      </I18nProvider>
    );

    const { rerender } = render(buildTable());

    reportChartLoading('a', true);
    reportChartLoading('b', true);
    reportChartLoading('a', false);
    expect(onRenderComplete).not.toHaveBeenCalled();

    // A repeated completion on the same chart must not be double-counted.
    reportChartLoading('a', false);
    expect(onRenderComplete).not.toHaveBeenCalled();

    // Re-rendering without a page or sort change must not forget already-loaded charts.
    rerender(buildTable());

    reportChartLoading('b', false);
    expect(onRenderComplete).toHaveBeenCalledTimes(1);
  });
});
