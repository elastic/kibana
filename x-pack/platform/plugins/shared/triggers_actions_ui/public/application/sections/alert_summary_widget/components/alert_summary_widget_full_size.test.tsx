/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { mockedAlertSummaryResponse, mockedChartProps } from '../../../mock/alert_summary_widget';
import type { AlertSummaryWidgetFullSizeProps } from './alert_summary_widget_full_size';
import { AlertSummaryWidgetFullSize } from './alert_summary_widget_full_size';
import { ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ, TOTAL_ALERT_COUNT_DATA_TEST_SUBJ } from './constants';
import type { DependencyProps } from '../types';
import { LIGHT_THEME } from '@elastic/charts';

const dependencyProps: DependencyProps = {
  baseTheme: LIGHT_THEME,
  sparklineTheme: {},
};

describe('AlertSummaryWidgetFullSize', () => {
  const renderComponent = (props: Partial<AlertSummaryWidgetFullSizeProps> = {}) =>
    render(
      <IntlProvider locale="en">
        <AlertSummaryWidgetFullSize
          chartProps={mockedChartProps}
          dependencyProps={dependencyProps}
          timeZone="UTC"
          {...mockedAlertSummaryResponse}
          {...props}
        />
      </IntlProvider>
    );

  it('should render AlertSummaryWidgetFullSize', async () => {
    renderComponent();

    expect(screen.getByTestId('alertSummaryWidgetFullSize')).toBeTruthy();
  });

  it('should render counts correctly', async () => {
    renderComponent();

    expect(screen.queryByTestId(ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent('2');
    expect(screen.queryByTestId(TOTAL_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent('22');
  });

  it('should render higher counts correctly', async () => {
    renderComponent({
      activeAlertCount: 2000,
    });

    expect(screen.queryByTestId(ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent('2k');
    expect(screen.queryByTestId(TOTAL_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent('2.02k');
  });

  it('should render AlertSummaryWidgetFullSize without a chart', async () => {
    renderComponent({
      hideChart: true,
    });

    expect(screen.getByTestId('alertSummaryWidgetFullSize')).toBeTruthy();
    expect(
      screen.queryByTestId('alertSummaryWidgetFullSizeChartContainer')
    ).not.toBeInTheDocument();
  });

  it('should render AlertSummaryWidgetFullSize without stats', async () => {
    renderComponent({
      hideStats: true,
    });

    expect(screen.getByTestId('alertSummaryWidgetFullSize')).toBeTruthy();
    expect(screen.queryByTestId('alertSummaryWidgetFullSizeStats')).not.toBeInTheDocument();
  });
});
