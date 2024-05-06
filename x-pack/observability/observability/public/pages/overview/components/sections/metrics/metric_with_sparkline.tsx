/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  Settings,
  AreaSeries,
  TooltipType,
  Tooltip,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import { EuiFlexItem, EuiFlexGroup, EuiIcon, EuiTextColor } from '@elastic/eui';
import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EUI_SPARKLINE_THEME_PARTIAL } from '@elastic/eui/dist/eui_charts_theme';
import { ThemeContext } from 'styled-components';

import { i18n } from '@kbn/i18n';
import { NumberOrNull } from '../../../../..';

interface Props {
  id: string;
  value: NumberOrNull;
  timeseries: any[];
  formatter: (value: NumberOrNull) => string;
  color: number;
}
export function MetricWithSparkline({ id, formatter, value, timeseries, color }: Props) {
  const themeCTX = useContext(ThemeContext);
  const isDarkTheme = (themeCTX && themeCTX.darkMode) || false;
  const theme = [EUI_SPARKLINE_THEME_PARTIAL];
  const baseTheme = isDarkTheme ? DARK_THEME : LIGHT_THEME;

  const colors = baseTheme.colors?.vizColors ?? [];

  if (!value) {
    return (
      <EuiTextColor color="subdued">
        <EuiIcon type="visLine" />
         
        <FormattedMessage
          id="xpack.observability.metricWithSparkline.nATextColorLabel"
          defaultMessage="N/A"
        />
      </EuiTextColor>
    );
  }
  return (
    <EuiFlexGroup gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <Chart size={{ height: 18, width: 40 }}>
          <Tooltip type={TooltipType.None} />
          <Settings
            baseTheme={baseTheme}
            theme={theme}
            showLegend={false}
            locale={i18n.getLocale()}
          />
          <AreaSeries
            id={id}
            data={timeseries}
            xAccessor={'timestamp'}
            yAccessors={[id]}
            color={colors[color] || '#006BB4'}
          />
        </Chart>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ whiteSpace: 'nowrap' }}>
        {formatter(value)}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
