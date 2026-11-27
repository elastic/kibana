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
import type { ChartComponentProps } from './chart_component';
import type { SelectedChangePoint } from './change_point_detection_context';
import { ChartsGrid } from './charts_grid';

const chartProps = new Map<string, ChartComponentProps>();

jest.mock('./chart_component', () => ({
  ChartComponent: (props: ChartComponentProps) => {
    chartProps.set(props.annotation.id, props);
    return null;
  },
}));

const buildChangePoint = (id: string): SelectedChangePoint => ({
  id,
  label: 'dip',
  type: 'dip',
  group: { name: 'host', value: id },
  fn: 'avg',
  metricField: 'bytes',
  splitField: 'host',
});

const reportChartLoading = (id: string, isLoading: boolean) => {
  act(() => {
    chartProps.get(id)?.onLoading?.(isLoading);
  });
};

describe('ChartsGrid', () => {
  beforeEach(() => {
    chartProps.clear();
  });

  it('reports render complete once every chart has loaded its data', () => {
    const onRenderComplete = jest.fn();

    render(
      <I18nProvider>
        <EuiProvider>
          <ChartsGrid
            parentApi={undefined}
            changePoints={[buildChangePoint('a'), buildChangePoint('b')]}
            interval="1h"
            onRenderComplete={onRenderComplete}
          />
        </EuiProvider>
      </I18nProvider>
    );

    reportChartLoading('a', true);
    reportChartLoading('b', true);
    reportChartLoading('a', false);
    expect(onRenderComplete).not.toHaveBeenCalled();

    reportChartLoading('b', false);
    expect(onRenderComplete).toHaveBeenCalledTimes(1);
  });
});
