/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AnnotationDomainType,
  Axis,
  Chart,
  LineAnnotation,
  LineSeries,
  PartialTheme,
  Settings,
  TickFormatter,
  Tooltip,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { calculateAuto } from '@kbn/calculate-auto';
import { i18n } from '@kbn/i18n';
import { range } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { StreamsChartTooltip } from '../streams_chart_tooltip';

export interface TimelineEvent {
  id: string;
  time: number;
  label: React.ReactNode;
  color: string;
  header: React.ReactNode;
}

interface TimelineProps {
  events: TimelineEvent[];
  start: number;
  end: number;
  xFormatter: TickFormatter;
}

export function Timeline({ events, start, end, xFormatter }: TimelineProps) {
  const {
    dependencies: {
      start: { charts },
    },
  } = useKibana();

  const theme = useEuiTheme().euiTheme;

  const baseTheme = charts.theme.useChartsBaseTheme();
  const defaultTheme = charts.theme.chartsDefaultBaseTheme;

  const minimalChartTheme: PartialTheme = {
    chartMargins: { left: 0, right: 0, top: 0, bottom: 0 },
    chartPaddings: {
      top: 12,
      bottom: 12,
    },
    lineSeriesStyle: {
      fit: {
        line: {
          opacity: 0,
        },
      },
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
  };

  // make sure there's nice ticks
  const valuesWithNiceTicks = useMemo(() => {
    const delta = calculateAuto.atLeast(20, moment.duration(end - start))?.asMilliseconds()!;

    const buckets = Math.floor((end - start) / delta);

    const roundedStart = Math.round(start / delta) * delta;

    return range(0, buckets)
      .map((index) => {
        return {
          x: roundedStart + index * delta,
        };
      })
      .concat(
        events.map((event) => {
          return { x: event.time };
        })
      );
  }, [start, end, events]);

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle
            size="xs"
            className={css`
              white-space: nowrap;
            `}
          >
            <h3>
              {i18n.translate('xpack.streams.timeline.title', {
                defaultMessage: 'Timeline',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <Chart
          size={{
            height: 48,
          }}
        >
          <Settings
            theme={[minimalChartTheme, baseTheme]}
            baseTheme={defaultTheme}
            noResults={<></>}
          />
          <Tooltip headerFormatter={xFormatter} />
          <Axis id="x_axis" position="bottom" tickFormat={xFormatter} ticks={20} />
          <Axis
            id="y_axis"
            position="left"
            domain={{ min: 0, max: 100 }}
            hide
            gridLine={{ opacity: 0 }}
          />
          <LineSeries
            id="dummy"
            data={valuesWithNiceTicks}
            xAccessor={'x'}
            yAccessors={['x']}
            color={'rgba(0,0,0,0)'}
          />
          <LineAnnotation
            id="annotations"
            dataValues={events.map((event) => ({ dataValue: event.time, event }))}
            domainType={AnnotationDomainType.XDomain}
            marker={(point) => {
              const { event } = point as { dataValue: number; event: TimelineEvent };
              return (
                <EuiIcon
                  type="dot"
                  color={event.color}
                  size="l"
                  className={css`
                    circle {
                      stroke: ${theme.colors.backgroundBasePlain};
                      stroke-width: 1px;
                    }
                  `}
                />
              );
            }}
            customTooltip={({ datum }) => {
              const { event } = datum as { dataValue: number; event: TimelineEvent };
              return (
                <StreamsChartTooltip
                  header={event.header}
                  color={event.color}
                  label={event.label}
                />
              );
            }}
          />
        </Chart>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
