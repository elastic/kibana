/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  AlertSummaryWidgetCompact,
  AlertSummaryWidgetCompactProps,
} from './alert_summary_widget_compact';
import { render } from '@testing-library/react';
import { mockedAlertSummaryResponse, mockedChartProps } from '../../../mock/alert_summary_widget';
import { ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ, TOTAL_ALERT_COUNT_DATA_TEST_SUBJ } from './constants';
import { LIGHT_THEME } from '@elastic/charts';
import { DependencyProps } from '../types';

const dependencyProps: DependencyProps = {
  baseTheme: LIGHT_THEME,
  sparklineTheme: {},
};

describe('AlertSummaryWidgetCompact', () => {
  const renderComponent = (props: Partial<AlertSummaryWidgetCompactProps> = {}) =>
    render(
      <IntlProvider locale="en">
        <AlertSummaryWidgetCompact
          chartProps={mockedChartProps}
          onClick={jest.fn}
          dependencyProps={dependencyProps}
          {...mockedAlertSummaryResponse}
          {...props}
        />
      </IntlProvider>
    );

  it('should render AlertSummaryWidgetCompact', async () => {
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId('alertSummaryWidgetCompact')).toBeTruthy();
  });

  it('should render counts correctly', async () => {
    const alertSummaryWidget = renderComponent();

    expect(alertSummaryWidget.queryByTestId(ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent(
      '2'
    );
    expect(alertSummaryWidget.queryByTestId(TOTAL_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent(
      '22'
    );
  });

  it('should render higher counts correctly', async () => {
    const alertSummaryWidget = renderComponent({
      activeAlertCount: 2000,
    });

    expect(alertSummaryWidget.queryByTestId(ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent(
      '2k'
    );
    expect(alertSummaryWidget.queryByTestId(TOTAL_ALERT_COUNT_DATA_TEST_SUBJ)).toHaveTextContent(
      '2.02k'
    );
  });
});
