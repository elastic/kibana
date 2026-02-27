/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useEuiFontSize,
  useEuiTheme,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiResizeObserver,
  EuiText,
  transparentize,
} from '@elastic/eui';

import { throttle } from 'lodash';
import type {
  BrushEndListener,
  ElementClickListener,
  CustomTooltip,
  HeatmapBrushEvent,
  HeatmapElementEvent,
  HeatmapSpec,
  HeatmapStyle,
  PartialTheme,
  TooltipProps,
  TooltipValue,
} from '@elastic/charts';
import { Chart, Heatmap, Position, ScaleType, Settings, Tooltip } from '@elastic/charts';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { css } from '@emotion/react';
import { getThemeResolvedSeverityColor, ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
import { formatHumanReadableDateTime } from '@kbn/ml-date-utils';
import type { TimeBuckets as TimeBucketsClass } from '@kbn/ml-time-buckets';
import { SwimLanePagination } from './swimlane_pagination';
import type {
  AppStateSelectedCells,
  OverallSwimlaneData,
  ViewBySwimLaneData,
} from './explorer_utils';
import type { SwimlaneType } from './explorer_constants';
import { SWIMLANE_TYPE } from './explorer_constants';
import { mlEscape } from '../util/string_utils';
import { FormattedTooltip } from '../components/chart_tooltip/chart_tooltip';
import { EMPTY_FIELD_VALUE_LABEL } from '../timeseriesexplorer/components/entity_control/entity_control';
import { SWIM_LANE_LABEL_WIDTH, Y_AXIS_LABEL_PADDING } from './constants';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

/**
 * Ignore insignificant resize, e.g. browser scrollbar appearance.
 */
const RESIZE_THROTTLE_TIME_MS = 500;
const BORDER_WIDTH = 1;
export const CELL_HEIGHT = 30;
const LEGEND_HEIGHT = 34;
const X_AXIS_HEIGHT = 24;
const MAX_ANOMALY_SCORE_LEGEND = 100;

export function isViewBySwimLaneData(arg: any): arg is ViewBySwimLaneData {
  return arg && Object.hasOwn(arg, 'cardinality');
}

/**
 * Provides a custom tooltip for the anomaly swim lane chart.
 */
const SwimLaneTooltip =
  (fieldName?: string): CustomTooltip =>
  ({ values }) => {
    const tooltipData: TooltipValue[] = [];

    if (values.length === 1 && fieldName) {
      // Y-axis tooltip for viewBy swim lane
      const [yAxis] = values;
      // @ts-ignore
      tooltipData.push({ skipHeader: true });
      tooltipData.push({
        label: fieldName,
        value: yAxis.value,
        // @ts-ignore
        seriesIdentifier: {
          key: yAxis.value,
        },
      });
    } else if (values.length === 3) {
      // Cell tooltip
      const [xAxis, yAxis, cell] = values;

      // Display date using same format as Kibana visualizations.
      const formattedDate = formatHumanReadableDateTime(parseInt(xAxis.value, 10));
      tooltipData.push({ label: formattedDate } as TooltipValue);

      if (fieldName !== undefined) {
        tooltipData.push({
          label: fieldName,
          value: yAxis.value,
          // @ts-ignore
          seriesIdentifier: {
            key: yAxis.value,
          },
        });
      }
      tooltipData.push({
        label: i18n.translate('xpack.ml.explorer.swimlane.maxAnomalyScoreLabel', {
          defaultMessage: 'Max anomaly score',
        }),
        value: cell.formattedValue === '0' ? ' < 1' : cell.formattedValue,
        color: cell.color,
        // @ts-ignore
        seriesIdentifier: {
          key: cell.value,
        },
      });
    }

    return <FormattedTooltip tooltipData={tooltipData} />;
  };

export interface SwimlaneProps {
  filterActive?: boolean;
  timeBuckets: InstanceType<typeof TimeBucketsClass>;
  showLegend?: boolean;
  swimlaneData: OverallSwimlaneData | ViewBySwimLaneData;
  swimlaneType: SwimlaneType;
  selection?: AppStateSelectedCells | null;
  onCellsSelection?: (payload?: AppStateSelectedCells) => void;
  'data-test-subj'?: string;
  onResize: (width: number) => void;
  fromPage?: number;
  perPage?: number;
  swimlaneLimit?: number;
  onPaginationChange?: (arg: { perPage?: number; fromPage?: number }) => void;
  isLoading: boolean;
  noDataWarning: string | JSX.Element | null;
  /**
   * Unique id of the chart
   */
  id: string;
  /**
   * Enables/disables timeline on the X-axis.
   */
  showTimeline?: boolean;
  showYAxis?: boolean;
  yAxisWidth?: HeatmapStyle['yAxisLabel']['width'];
  chartsService: ChartsPluginStart;
  onRenderComplete?: () => void;
}

/**
 * Anomaly swim lane container responsible for handling resizing, pagination and
 * providing swim lane vis with required props.
 */
export const SwimlaneContainer: FC<SwimlaneProps> = ({
  id,
  onResize,
  perPage,
  fromPage,
  swimlaneLimit,
  onPaginationChange,
  isLoading,
  noDataWarning,
  filterActive,
  swimlaneData,
  swimlaneType,
  selection,
  onCellsSelection,
  timeBuckets,
  chartsService,
  showTimeline = true,
  showYAxis = true,
  showLegend = true,
  'data-test-subj': dataTestSubj,
  yAxisWidth,
  onRenderComplete,
}) => {
  const {
    theme: { useChartsBaseTheme },
  } = chartsService;

  const [chartWidth, setChartWidth] = useState<number>(0);

  const { colorMode, euiTheme } = useEuiTheme();
  const isDarkTheme = colorMode === 'DARK';

  // Holds the container height for previously fetched data
  const containerHeightRef = useRef<number>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      const resultNewWidth = e.width - SWIM_LANE_LABEL_WIDTH;
      setChartWidth(resultNewWidth);
      onResize(resultNewWidth);
    }, RESIZE_THROTTLE_TIME_MS),
    [chartWidth]
  );

  const baseTheme = useChartsBaseTheme();

  const swimLanePoints = useMemo(() => {
    const showFilterContext = filterActive === true && swimlaneType === SWIMLANE_TYPE.OVERALL;

    if (!swimlaneData?.points) {
      return [];
    }

    const sortedLaneValues = swimlaneData.laneLabels;

    return swimlaneData.points
      .map((v) => {
        const formatted = { ...v, time: v.time * 1000, value: v.value === 0 ? null : v.value };
        if (showFilterContext) {
          formatted.laneLabel = i18n.translate('xpack.ml.explorer.overallSwimlaneUnfilteredLabel', {
            defaultMessage: '{label} (unfiltered)',
            values: { label: mlEscape(v.laneLabel) },
          });
        }
        return formatted;
      })
      .sort((a, b) => {
        let aIndex = sortedLaneValues.indexOf(a.laneLabel);
        let bIndex = sortedLaneValues.indexOf(b.laneLabel);
        aIndex = aIndex > -1 ? aIndex : sortedLaneValues.length;
        bIndex = bIndex > -1 ? bIndex : sortedLaneValues.length;
        return aIndex - bIndex;
      });
  }, [swimlaneData?.points, filterActive, swimlaneType, swimlaneData?.laneLabels]);

  const showSwimlane = swimlaneData?.laneLabels?.length > 0 && swimLanePoints.length > 0;

  const isPaginationVisible =
    (showSwimlane || isLoading) &&
    swimlaneLimit !== undefined &&
    swimlaneLimit > 5 &&
    !!onPaginationChange &&
    !!fromPage &&
    !!perPage;

  const rowsCount = swimlaneData?.laneLabels?.length ?? 0;

  const containerHeight = useMemo(() => {
    // Persists container height during loading to prevent page from jumping
    return isLoading
      ? containerHeightRef.current
      : // TODO update when elastic charts X label will be fixed
        rowsCount * (CELL_HEIGHT + BORDER_WIDTH * 2) +
          (showLegend ? LEGEND_HEIGHT : 0) +
          (showTimeline ? X_AXIS_HEIGHT : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, rowsCount]);

  useEffect(() => {
    if (!isLoading) {
      containerHeightRef.current = containerHeight;
    }
  }, [isLoading, containerHeight]);

  const highlightedData: HeatmapSpec['highlightedData'] = useMemo(() => {
    if (!selection || !swimlaneData) return;

    if (
      (swimlaneType !== selection.type ||
        (swimlaneData?.fieldName !== undefined &&
          swimlaneData.fieldName !== selection.viewByFieldName)) &&
      filterActive === false
    ) {
      // Not this swim lane which was selected.
      return;
    }

    return { x: selection.times.map((v) => v * 1000), y: selection.lanes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, swimlaneData, swimlaneType]);

  const showBrush = !!onCellsSelection;

  const euiFontSizeXS = useEuiFontSize('xs', { unit: 'px' }).fontSize as string;

  const themeOverrides = useMemo<PartialTheme>(() => {
    if (!showSwimlane) return {};

    const theme: PartialTheme = {
      background: {
        color: euiTheme.colors.backgroundBasePlain,
      },
      heatmap: {
        grid: {
          stroke: {
            width: BORDER_WIDTH,
            color: euiTheme.border.color,
          },
        },
        cell: {
          maxWidth: 'fill',
          maxHeight: 'fill',
          label: {
            visible: false,
          },
          border: {
            stroke: euiTheme.colors.borderBasePlain,
            strokeWidth: 0,
          },
        },
        yAxisLabel: {
          visible: showYAxis,
          width: yAxisWidth,
          textColor: euiTheme.colors.textSubdued,
          padding: Y_AXIS_LABEL_PADDING,
          fontSize: parseInt(euiFontSizeXS, 10),
        },
        xAxisLabel: {
          visible: showTimeline,
          textColor: euiTheme.colors.textSubdued,
          fontSize: parseInt(euiFontSizeXS, 10),
        },
        brushMask: {
          visible: showBrush,
          fill: isDarkTheme
            ? transparentize(euiTheme.colors.backgroundBaseSubdued, 0.65)
            : 'rgb(247,247,247,50%)',
        },
        brushArea: {
          visible: showBrush,
          stroke: isDarkTheme ? 'rgb(255, 255, 255)' : 'rgb(105, 112, 125)',
        },
        ...(showLegend ? { maxLegendHeight: LEGEND_HEIGHT } : {}),
      },
    };

    return theme;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showSwimlane,
    swimlaneType,
    swimlaneData?.fieldName,
    isDarkTheme,
    timeBuckets,
    onCellsSelection,
  ]);

  const chartRef = useRef(null);

  const handleCursorUpdate = useActiveCursor(chartsService.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  const onElementClick = useCallback(
    (e: HeatmapElementEvent[]) => {
      if (!onCellsSelection) return;

      const cell = e[0][0];
      const startTime = (cell.datum.x as number) / 1000;
      const payload = {
        lanes: [String(cell.datum.y)],
        times: [startTime, startTime + swimlaneData.interval] as [number, number],
        type: swimlaneType,
        viewByFieldName: swimlaneData.fieldName,
      };
      onCellsSelection(payload);
    },
    [swimlaneType, swimlaneData?.fieldName, swimlaneData?.interval, onCellsSelection]
  ) as ElementClickListener;

  const tooltipOptions = useMemo<TooltipProps>(
    () => ({
      placement: 'auto',
      fallbackPlacements: ['left'],
      boundary: 'chart',
      customTooltip: SwimLaneTooltip(swimlaneData?.fieldName),
    }),
    [swimlaneData?.fieldName]
  );

  const xDomain = useMemo(
    () =>
      swimlaneData
        ? {
            min: swimlaneData.earliest * 1000,
            max: swimlaneData.latest * 1000,
            minInterval: swimlaneData.interval * 1000,
          }
        : undefined,
    [swimlaneData]
  );

  const onBrushEnd = (e: HeatmapBrushEvent) => {
    if (!e.cells.length || !showBrush) return;

    if (typeof onCellsSelection === 'function') {
      onCellsSelection({
        lanes: e.y as string[],
        times: e.x!.map((v) => (v as number) / 1000) as [number, number],
        type: swimlaneType,
        viewByFieldName: swimlaneData.fieldName,
      });
    }
  };

  const noSwimLaneData = !isLoading && !showSwimlane && !!noDataWarning;

  if (noSwimLaneData) {
    onRenderComplete?.();
  }
  const swimlaneStyles = css({
    '.echLegendListContainer': {
      height: '34px !important',
    },
    '.echLegendList': {
      display: 'flex !important',
      justifyContent: 'space-between !important',
      flexWrap: 'nowrap',
      position: 'absolute',
      right: 0,
    },
  });
  // A resize observer is required to compute the bucket span based on the chart width to fetch the data accordingly
  return (
    <EuiResizeObserver onResize={resizeHandler}>
      {(resizeRef) => (
        <EuiFlexGroup
          gutterSize={'none'}
          direction={'column'}
          ref={resizeRef}
          data-test-subj={dataTestSubj}
          css={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
        >
          <EuiFlexItem
            css={{
              width: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
            grow={false}
          >
            <>
              <div>
                <div
                  style={{ height: `${containerHeight}px` }}
                  css={css`
                    position: relative;
                  `}
                  hidden={noSwimLaneData}
                >
                  {showSwimlane && !isLoading && (
                    <div
                      data-test-subj="mlSwimLaneContainer"
                      css={{ height: '100%', width: '100%' }}
                    >
                      <Chart css={swimlaneStyles} ref={chartRef}>
                        <Tooltip {...tooltipOptions} />
                        <Settings
                          theme={themeOverrides}
                          baseTheme={baseTheme}
                          onElementClick={onElementClick}
                          onPointerUpdate={handleCursorUpdate}
                          showLegend={showLegend}
                          legendPosition={Position.Top}
                          xDomain={xDomain}
                          debugState={window._echDebugStateFlag ?? false}
                          onBrushEnd={onBrushEnd as BrushEndListener}
                          locale={i18n.getLocale()}
                          onRenderChange={(isRendered) => {
                            if (isRendered && onRenderComplete) {
                              onRenderComplete();
                            }
                          }}
                        />

                        <Heatmap
                          id={id}
                          timeZone="UTC"
                          colorScale={{
                            type: 'bands',
                            bands: [
                              {
                                start: ML_ANOMALY_THRESHOLD.LOW,
                                end: ML_ANOMALY_THRESHOLD.WARNING,
                                color: getThemeResolvedSeverityColor(
                                  ML_ANOMALY_THRESHOLD.LOW,
                                  euiTheme
                                ),
                              },
                              {
                                start: ML_ANOMALY_THRESHOLD.WARNING,
                                end: ML_ANOMALY_THRESHOLD.MINOR,
                                color: getThemeResolvedSeverityColor(
                                  ML_ANOMALY_THRESHOLD.WARNING,
                                  euiTheme
                                ),
                              },
                              {
                                start: ML_ANOMALY_THRESHOLD.MINOR,
                                end: ML_ANOMALY_THRESHOLD.MAJOR,
                                color: getThemeResolvedSeverityColor(
                                  ML_ANOMALY_THRESHOLD.MINOR,
                                  euiTheme
                                ),
                              },
                              {
                                start: ML_ANOMALY_THRESHOLD.MAJOR,
                                end: ML_ANOMALY_THRESHOLD.CRITICAL,
                                color: getThemeResolvedSeverityColor(
                                  ML_ANOMALY_THRESHOLD.MAJOR,
                                  euiTheme
                                ),
                              },
                              {
                                start: ML_ANOMALY_THRESHOLD.CRITICAL,
                                end: MAX_ANOMALY_SCORE_LEGEND,
                                color: getThemeResolvedSeverityColor(
                                  ML_ANOMALY_THRESHOLD.CRITICAL,
                                  euiTheme
                                ),
                              },
                            ],
                          }}
                          data={swimLanePoints}
                          xAccessor="time"
                          yAccessor="laneLabel"
                          valueAccessor="value"
                          valueFormatter={(score: number) => String(Math.floor(score))}
                          highlightedData={highlightedData}
                          xScale={{
                            type: ScaleType.Time,
                            interval: {
                              type: 'fixed',
                              unit: 'ms',
                              // the xDomain.minInterval should always be available at rendering time
                              // adding a fallback to 1m bucket
                              value: xDomain?.minInterval ?? 1000 * 60,
                            },
                          }}
                          ySortPredicate="dataIndex"
                          yAxisLabelFormatter={(laneLabel) => {
                            return laneLabel === '' ? EMPTY_FIELD_VALUE_LABEL : String(laneLabel);
                          }}
                          xAxisLabelFormatter={(v) => {
                            timeBuckets.setInterval(`${swimlaneData.interval}s`);
                            const scaledDateFormat = timeBuckets.getScaledDateFormat();
                            return moment(v).format(scaledDateFormat);
                          }}
                        />
                      </Chart>
                    </div>
                  )}

                  {isLoading && (
                    <EuiText
                      textAlign={'center'}
                      css={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%,-50%)',
                      }}
                    >
                      <EuiLoadingChart size="xl" data-test-subj="mlSwimLaneLoadingIndicator" />
                    </EuiText>
                  )}
                </div>
                {noSwimLaneData ? <>{noDataWarning}</> : null}
              </div>
            </>
          </EuiFlexItem>

          {isPaginationVisible && (
            <EuiFlexItem grow={false}>
              <SwimLanePagination
                cardinality={swimlaneLimit!}
                fromPage={fromPage!}
                perPage={perPage!}
                onPaginationChange={onPaginationChange!}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      )}
    </EuiResizeObserver>
  );
};
