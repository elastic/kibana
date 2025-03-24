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
  Tooltip,
  TooltipContainer,
  TooltipDivider,
  TooltipHeader,
  TooltipTable,
  TooltipTableBody,
  TooltipTableCell,
  TooltipTableColorCell,
  TooltipTableRow,
  niceTimeFormatter,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { calculateAuto } from '@kbn/calculate-auto';
import { i18n } from '@kbn/i18n';
import { range } from 'lodash';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';

export interface TimelineEvent {
  id: string;
  time: number;
  label: React.ReactNode;
  color: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  start: number;
  end: number;
}

export function Timeline({ events, start, end }: TimelineProps) {
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
      point: { opacity: 0 },
    },
    areaSeriesStyle: {
      point: { opacity: 0 },
    },
  };

  const xFormatter = useMemo(() => niceTimeFormatter([start, end]), [start, end]);

  const dummyValues = useMemo(() => {
    const delta = calculateAuto.atLeast(20, moment.duration(end - start))?.asMilliseconds()!;

    const buckets = Math.floor((end - start) / delta);

    return range(0, buckets).map((index) => {
      return {
        x: start + index * delta,
        y: null,
      };
    });
  }, [start, end]);

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
          <LineSeries id="dummy" data={dummyValues} xAccessor={'x'} yAccessors={['y']} />
          {events.map((event) => {
            return (
              <LineAnnotation
                key={event.id}
                id={event.id}
                dataValues={[{ dataValue: event.time }]}
                domainType={AnnotationDomainType.XDomain}
                marker={
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
                }
                customTooltip={({ details, header, datum }) => {
                  return (
                    <TooltipContainer>
                      <TooltipTable
                        gridTemplateColumns="none"
                        className={css`
                          padding: ${theme.size.xs};
                        `}
                      >
                        <TooltipTableBody>
                          <TooltipTableRow>
                            <TooltipTableColorCell color={event.color} />
                            <TooltipTableCell>{event.label}</TooltipTableCell>
                          </TooltipTableRow>
                        </TooltipTableBody>
                      </TooltipTable>
                    </TooltipContainer>
                  );
                }}
              />
            );
          })}
        </Chart>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
