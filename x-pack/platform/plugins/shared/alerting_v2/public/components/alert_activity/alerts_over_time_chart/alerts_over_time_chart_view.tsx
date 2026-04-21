/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React, { useMemo } from 'react';
import type { BrushEndListener, Theme } from '@elastic/charts';
import {
  Axis,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertSummaryResponse } from '@kbn/alerting-v2-schemas';
import { getAlertActivityColors } from '../get_alert_activity_colors';

const defaultTitle = i18n.translate('xpack.alertingV2.alertsOverTimeChart.title', {
  defaultMessage: 'Alerts',
});

const activeSeriesLabel = i18n.translate('xpack.alertingV2.alertsOverTimeChart.activeSeriesLabel', {
  defaultMessage: 'Active',
});

const recoveredSeriesLabel = i18n.translate(
  'xpack.alertingV2.alertsOverTimeChart.recoveredSeriesLabel',
  { defaultMessage: 'Recovered' }
);

const exploreInDiscoverLabel = i18n.translate(
  'xpack.alertingV2.alertsOverTimeChart.exploreInDiscoverLabel',
  { defaultMessage: 'Explore in Discover' }
);

const TOOLTIP_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

export interface AlertsOverTimeChartViewProps {
  isLoading?: boolean;
  isError?: boolean;
  data?: AlertSummaryResponse;
  /** Optional panel title override. Defaults to "Alerts". */
  title?: string;
  /** Rendered when resolvable; the link disappears when undefined. */
  discoverHref?: string;
  /** Optional elastic-charts base theme. */
  baseTheme?: Theme;
  /** Callback when the user brushes a time range on the chart. */
  onBrushEnd?: (range: { from: string; to: string }) => void;
}

/** Pure presentational component for the alerts-over-time chart. */
export const AlertsOverTimeChartView = ({
  isLoading,
  isError,
  data,
  title,
  discoverHref,
  baseTheme,
  onBrushEnd,
}: AlertsOverTimeChartViewProps) => {
  const { euiTheme } = useEuiTheme();
  const { active: activeColor, recovered: recoveredColor } = getAlertActivityColors(euiTheme);

  const hasData = Boolean(data && (data.activeEventCount > 0 || data.recoveredEventCount > 0));

  const brushEndListener: BrushEndListener | undefined = useMemo(() => {
    if (!onBrushEnd) return undefined;
    return ({ x }) => {
      if (!x) return;
      const [from, to] = x;
      onBrushEnd({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
      });
    };
  }, [onBrushEnd]);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="alertsOverTimeChart">
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{title ?? defaultTitle}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {discoverHref && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={discoverHref}
              target="_blank"
              color="text"
              size="s"
              iconType="discoverApp"
              iconSide="left"
              flush="both"
              data-test-subj="alertsOverTimeChartDiscoverLink"
            >
              {exploreInDiscoverLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {isLoading && (
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          style={{ minHeight: 220 }}
          data-test-subj="alertsOverTimeChartLoading"
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {!isLoading && isError && (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="warning"
          data-test-subj="alertsOverTimeChartError"
          title={i18n.translate('xpack.alertingV2.alertsOverTimeChart.errorTitle', {
            defaultMessage: 'Unable to load alert activity chart',
          })}
        />
      )}

      {!isLoading && !isError && data && !hasData && (
        <EuiEmptyPrompt
          data-test-subj="alertsOverTimeChartEmpty"
          iconType="bell"
          titleSize="xs"
          title={
            <h4>
              {i18n.translate('xpack.alertingV2.alertsOverTimeChart.emptyTitle', {
                defaultMessage: 'No alert activity in this range',
              })}
            </h4>
          }
          body={
            <p>
              {i18n.translate('xpack.alertingV2.alertsOverTimeChart.emptyBody', {
                defaultMessage:
                  'No active or recovered alert events were recorded for the selected rules.',
              })}
            </p>
          }
        />
      )}

      {!isLoading && !isError && data && hasData && (
        <div data-test-subj="alertsOverTimeChartContainer">
          <Chart size={['100%', 220]}>
            <Tooltip headerFormatter={(t) => moment(t.value).format(TOOLTIP_DATE_FORMAT)} />
            <Settings
              baseTheme={baseTheme}
              legendPosition={Position.Right}
              showLegend
              onBrushEnd={brushEndListener}
              locale={i18n.getLocale()}
            />
            <Axis id="bottom" position={Position.Bottom} gridLine={{ visible: true }} />
            <Axis
              id="left"
              position={Position.Left}
              gridLine={{ visible: true }}
              integersOnly
              ticks={4}
            />
            <LineSeries
              id={activeSeriesLabel}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="key"
              yAccessors={['doc_count']}
              data={data.activeSeries}
              color={[activeColor]}
              curve={CurveType.CURVE_MONOTONE_X}
              lineSeriesStyle={{
                line: { strokeWidth: 2 },
                point: { visible: 'never' },
              }}
            />
            <LineSeries
              id={recoveredSeriesLabel}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="key"
              yAccessors={['doc_count']}
              data={data.recoveredSeries}
              color={[recoveredColor]}
              curve={CurveType.CURVE_MONOTONE_X}
              lineSeriesStyle={{
                line: { strokeWidth: 2 },
                point: { visible: 'never' },
              }}
            />
          </Chart>
        </div>
      )}
    </EuiPanel>
  );
};
