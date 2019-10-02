/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { DonutChartLegendRow } from './donut_chart_legend_row';

interface Props {
  down: number;
  up: number;
}

export const DonutChartLegend = ({ down, up }: Props) => (
  <div style={{ maxWidth: '150px' }}>
    <DonutChartLegendRow
      // TODO: use context danger color
      color="#AD392D"
      content={down}
      message={i18n.translate('xpack.uptime.donutChart.legend.downRowLabel', {
        defaultMessage: 'Down',
      })}
    />
    <EuiFlexItem>
      <EuiSpacer size="l" />
    </EuiFlexItem>
    <DonutChartLegendRow
      // TODO: use context gray color
      color="#D5DAE4"
      content={up}
      message={i18n.translate('xpack.uptime.donutChart.legend.upRowLabel', {
        defaultMessage: 'Up',
      })}
    />
  </div>
);
