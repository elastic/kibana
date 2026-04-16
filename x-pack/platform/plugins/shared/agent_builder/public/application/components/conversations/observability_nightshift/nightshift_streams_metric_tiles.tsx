/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Chart, LayoutDirection, LIGHT_THEME, Metric, Settings } from '@elastic/charts';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/**
 * Two Elastic Charts {@link https://eui.elastic.co/docs/dataviz/types/metric-chart/ metric} tiles
 * in a single horizontal row: `data={[[{col1}, {col2}]]}` per
 * {@link https://eui.elastic.co/docs/dataviz/types/metric-chart/#multiple-horizontal-metrics multiple horizontal metrics}.
 * Each tile uses {@link https://eui.elastic.co/docs/dataviz/types/metric-chart/#progress-bar MetricWProgress}
 * (horizontal progress bar, shared track color).
 */
export const NightshiftStreamsMetricTiles: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  const data = useMemo(
    () => [
      [
        {
          subtitle: i18n.translate(
            'xpack.agentBuilder.observabilityNightshift.metrics.docCountSubtitle',
            {
              defaultMessage: 'logs.ngnix.error',
            }
          ),
          value: 128_400,
          valueFormatter: (n: number) => n.toLocaleString(),
          domainMax: 200_000,
          progressBarDirection: LayoutDirection.Vertical,
          background: euiTheme.colors.backgroundBaseSubdued,
          color: euiTheme.colors.accent,
          extra: {
            value: '+22%',
          },
        },
        {
          subtitle: i18n.translate(
            'xpack.agentBuilder.observabilityNightshift.metrics.docCountSubtitle',
            {
              defaultMessage: 'logs.ngnix.access',
            }
          ),
          value: 48_200,
          valueFormatter: (n: number) => n.toLocaleString(),
          domainMax: 80_000,
          progressBarDirection: LayoutDirection.Vertical,
          background: euiTheme.colors.backgroundBaseSubdued,
          color: euiTheme.colors.accent,
          extra: {
            value: '+14%',
          },
        },
      ],
    ],
    [euiTheme.colors.accent, euiTheme.colors.backgroundBaseSubdued]
  );

  const chartContainerCss = css`
    height: 160px;
    width: 100%;

    /* Monospace for the primary metric value only (titles/subtitles stay theme sans). */
    .echMetricText__value {
      font-family: ${euiTheme.font.familyCode};
    }
  `;

  return (
    <div className="nightshiftStreamsMetricTiles" css={chartContainerCss}>
      <Chart>
        <Settings
          baseTheme={LIGHT_THEME}
          locale={i18n.getLocale()}
          theme={{
            metric: {
              minValueFontSize: 10,
              barBackground: euiTheme.colors.backgroundBaseDisabled,
              border: euiTheme.colors.borderBaseSubdued,
            },
          }}
        />
        <Metric id="nightshift-streams-metrics" data={data} />
      </Chart>
    </div>
  );
};
