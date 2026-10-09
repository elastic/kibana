/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { SingleMetricViewerChartSurface } from './single_metric_viewer_chart_surface';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('SingleMetricViewerChartSurface', () => {
  it('renders children and optional controls after the partition gate', () => {
    renderWithI18n(
      <SingleMetricViewerChartSurface
        fieldNamesWithEmptyValues={[]}
        controlsSlot={<span data-test-subj="controls-slot">controls</span>}
      >
        <span data-test-subj="chart-body">chart</span>
      </SingleMetricViewerChartSurface>
    );
    expect(screen.getByTestId('controls-slot')).toBeInTheDocument();
    expect(screen.getByTestId('chart-body')).toBeInTheDocument();
  });

  it('shows partition callout when partition fields are missing', () => {
    renderWithI18n(
      <SingleMetricViewerChartSurface fieldNamesWithEmptyValues={['host']}>
        <span data-test-subj="chart-body">chart</span>
      </SingleMetricViewerChartSurface>
    );
    expect(screen.getByText(/host/)).toBeInTheDocument();
    expect(screen.getByTestId('chart-body')).toBeInTheDocument();
  });
});
