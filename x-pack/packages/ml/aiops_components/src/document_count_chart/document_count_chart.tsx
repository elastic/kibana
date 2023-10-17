/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import moment from 'moment';

import {
  Axis,
  BrushEndListener,
  Chart,
  ElementClickListener,
  HistogramBarSeries,
  Position,
  ScaleType,
  Settings,
  XYChartElementEvent,
  XYBrushEvent,
} from '@elastic/charts';
import {
  BarStyleAccessor,
  RectAnnotationSpec,
} from '@elastic/charts/dist/chart_types/xy_chart/utils/specs';

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from '@kbn/core/public';
import {
  getLogRateAnalysisType,
  getSnappedWindowParameters,
  getWindowParameters,
  type LogRateAnalysisType,
  type LogRateHistogramItem,
  type WindowParameters,
} from '@kbn/aiops-utils';
import { MULTILAYER_TIME_AXIS_STYLE } from '@kbn/charts-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

import { DualBrush, DualBrushAnnotation } from '../..';

import { BrushBadge } from './brush_badge';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

interface TimeFilterRange {
  from: number;
  to: number;
}

/**
 * Brush settings
 */
export interface BrushSettings {
  /**
   * Optional label name for brush
   */
  label?: string;
  /**
   * Optional style for brush
   */
  annotationStyle?: RectAnnotationSpec['style'];
  /**
   * Optional width for brush
   */
  badgeWidth?: number;
}

/**
 * Callback function which gets called when the brush selection has changed
 *
 * @param windowParameters Baseline and deviation time ranges.
 * @param force Force update
 * @param logRateAnalysisType `spike` or `dip` based on median log rate bucket size
 */
export type BrushSelectionUpdateHandler = (
  windowParameters: WindowParameters,
  force: boolean,
  logRateAnalysisType: LogRateAnalysisType
) => void;

/**
 * Props for document count chart
 */
export interface DocumentCountChartProps {
  /** List of Kibana services that are required as dependencies */
  dependencies: {
    data: DataPublicPluginStart;
    charts: ChartsPluginStart;
    fieldFormats: FieldFormatsStart;
    uiSettings: IUiSettingsClient;
  };
  /** Optional callback for handling brush selection updates */
  brushSelectionUpdateHandler?: BrushSelectionUpdateHandler;
  /** Optional width */
  width?: number;
  /** Optional chart height */
  height?: number;
  /** Data chart points */
  chartPoints: LogRateHistogramItem[];
  /** Data chart points split */
  chartPointsSplit?: LogRateHistogramItem[];
  /** Start time range for the chart */
  timeRangeEarliest: number;
  /** Ending time range for the chart */
  timeRangeLatest: number;
  /** Time interval for the document count buckets */
  interval: number;
  /** Label to name the adjustedChartPointsSplit histogram */
  chartPointsSplitLabel: string;
  /** Whether or not brush has been reset */
  isBrushCleared: boolean;
  /** Timestamp for start of initial analysis */
  autoAnalysisStart?: number | WindowParameters;
  /** Optional style to override bar chart  */
  barStyleAccessor?: BarStyleAccessor;
  /** Optional color override for the default bar color for charts */
  barColorOverride?: string;
  /** Optional color override for the highlighted bar color for charts */
  barHighlightColorOverride?: string;
  /** Optional settings override for the 'deviation' brush */
  deviationBrush?: BrushSettings;
  /** Optional settings override for the 'baseline' brush */
  baselineBrush?: BrushSettings;
  /** Optional data-test-subject */
  dataTestSubj?: string;
}

const SPEC_ID = 'document_count';

const BADGE_HEIGHT = 20;
const BADGE_WIDTH = 75;

enum VIEW_MODE {
  ZOOM = 'zoom',
  BRUSH = 'brush',
}

function getTimezone(uiSettings: IUiSettingsClient) {
  if (uiSettings.isDefault('dateFormat:tz')) {
    const detectedTimezone = moment.tz.guess();
    if (detectedTimezone) return detectedTimezone;
    else return moment().format('Z');
  } else {
    return uiSettings.get('dateFormat:tz', 'Browser');
  }
}

function getBaselineBadgeOverflow(
  windowParametersAsPixels: WindowParameters,
  baselineBadgeWidth: number
) {
  const { baselineMin, baselineMax, deviationMin } = windowParametersAsPixels;

  const baselineBrushWidth = baselineMax - baselineMin;
  const baselineBadgeActualMax = baselineMin + baselineBadgeWidth;
  return deviationMin < baselineBadgeActualMax
    ? Math.max(0, baselineBadgeWidth - baselineBrushWidth)
    : 0;
}

/**
 * Document count chart with draggable brushes to select time ranges
 * by default use `Baseline` and `Deviation` for the badge names
 *
 * @param props DocumentCountChart component props
 * @returns The DocumentCountChart component.
 */
export const DocumentCountChart: FC<DocumentCountChartProps> = (props) => {
  const {
    dataTestSubj,
    dependencies,
    brushSelectionUpdateHandler,
    width,
    height,
    chartPoints,
    chartPointsSplit,
    timeRangeEarliest,
    timeRangeLatest,
    interval,
    chartPointsSplitLabel,
    isBrushCleared,
    autoAnalysisStart,
    barColorOverride,
    barStyleAccessor,
    barHighlightColorOverride,
    deviationBrush = {},
    baselineBrush = {},
  } = props;

  const { data, uiSettings, fieldFormats, charts } = dependencies;

  const chartTheme = charts.theme.useChartsTheme();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const xAxisFormatter = fieldFormats.deserialize({ id: 'date' });
  const useLegacyTimeAxis = uiSettings.get('visualization:useLegacyTimeAxis', false);

  const overallSeriesName = i18n.translate(
    'xpack.aiops.dataGrid.field.documentCountChart.seriesLabel',
    {
      defaultMessage: 'document count',
    }
  );

  const overallSeriesNameWithSplit = i18n.translate(
    'xpack.aiops.dataGrid.field.documentCountChartSplit.seriesLabel',
    {
      defaultMessage: 'Other document count',
    }
  );

  // TODO Let user choose between ZOOM and BRUSH mode.
  const [viewMode] = useState<VIEW_MODE>(VIEW_MODE.BRUSH);

  const hasNoData = useMemo(
    () =>
      (chartPoints === undefined || chartPoints.length < 1) &&
      (chartPointsSplit === undefined ||
        (Array.isArray(chartPointsSplit) && chartPointsSplit.length < 1)),
    [chartPoints, chartPointsSplit]
  );

  const adjustedChartPoints = useMemo(() => {
    // Display empty chart when no data in range and no split data to show
    if (hasNoData) return [{ time: timeRangeEarliest, value: 0 }];

    // If chart has only one bucket
    // it won't show up correctly unless we add an extra data point
    if (chartPoints.length === 1) {
      return [
        ...chartPoints,
        { time: interval ? Number(chartPoints[0].time) + interval : timeRangeEarliest, value: 0 },
      ];
    }
    return chartPoints;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPoints, timeRangeEarliest, timeRangeLatest, interval]);

  const adjustedChartPointsSplit = useMemo(() => {
    // Display empty chart when no data in range
    if (hasNoData) return [{ time: timeRangeEarliest, value: 0 }];

    // If chart has only one bucket
    // it won't show up correctly unless we add an extra data point
    if (Array.isArray(chartPointsSplit) && chartPointsSplit.length === 1) {
      return [
        ...chartPointsSplit,
        {
          time: interval ? Number(chartPointsSplit[0].time) + interval : timeRangeEarliest,
          value: 0,
        },
      ];
    }
    return chartPointsSplit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPointsSplit, timeRangeEarliest, timeRangeLatest, interval]);

  const snapTimestamps = useMemo(() => {
    const timestamps: number[] = [];
    let n = timeRangeEarliest;

    while (n <= timeRangeLatest + interval) {
      timestamps.push(n);
      n += interval;
    }

    return timestamps;
  }, [timeRangeEarliest, timeRangeLatest, interval]);

  const timefilterUpdateHandler = useCallback(
    (range: TimeFilterRange) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(range.from).toISOString(),
        to: moment(range.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );

  const onBrushEnd = ({ x }: XYBrushEvent) => {
    if (!x) {
      return;
    }
    const [from, to] = x;
    timefilterUpdateHandler({ from, to });
  };

  const timeZone = getTimezone(uiSettings);

  const [originalWindowParameters, setOriginalWindowParameters] = useState<
    WindowParameters | undefined
  >();
  const [windowParameters, setWindowParameters] = useState<WindowParameters | undefined>();
  const [windowParametersAsPixels, setWindowParametersAsPixels] = useState<
    WindowParameters | undefined
  >();

  const triggerAnalysis = useCallback(
    (startRange: number | WindowParameters) => {
      if (viewMode === VIEW_MODE.ZOOM && typeof startRange === 'number') {
        const range: TimeFilterRange = {
          from: startRange,
          to: startRange + interval,
        };

        timefilterUpdateHandler(range);
      } else if (viewMode === VIEW_MODE.BRUSH) {
        if (
          originalWindowParameters === undefined &&
          windowParameters === undefined &&
          adjustedChartPoints !== undefined
        ) {
          const wp =
            typeof startRange === 'number'
              ? getWindowParameters(
                  startRange + interval / 2,
                  timeRangeEarliest,
                  timeRangeLatest + interval
                )
              : startRange;
          const wpSnap = getSnappedWindowParameters(wp, snapTimestamps);
          setOriginalWindowParameters(wpSnap);
          setWindowParameters(wpSnap);

          if (brushSelectionUpdateHandler !== undefined) {
            brushSelectionUpdateHandler(
              wpSnap,
              true,
              getLogRateAnalysisType(adjustedChartPoints, wpSnap)
            );
          }
        }
      }
    },
    [
      interval,
      timeRangeEarliest,
      timeRangeLatest,
      snapTimestamps,
      originalWindowParameters,
      setWindowParameters,
      brushSelectionUpdateHandler,
      adjustedChartPoints,
      timefilterUpdateHandler,
      viewMode,
      windowParameters,
    ]
  );

  const onElementClick: ElementClickListener = useCallback(
    ([elementData]) => {
      if (brushSelectionUpdateHandler === undefined) {
        return;
      }
      const startRange = (elementData as XYChartElementEvent)[0].x;

      triggerAnalysis(startRange);
    },
    [triggerAnalysis, brushSelectionUpdateHandler]
  );

  useEffect(() => {
    if (autoAnalysisStart !== undefined) {
      triggerAnalysis(autoAnalysisStart);
    }
  }, [triggerAnalysis, autoAnalysisStart]);

  useEffect(() => {
    if (isBrushCleared && originalWindowParameters !== undefined) {
      setOriginalWindowParameters(undefined);
      setWindowParameters(undefined);
    }
  }, [isBrushCleared, originalWindowParameters]);

  function onWindowParametersChange(wp: WindowParameters, wpPx: WindowParameters) {
    if (brushSelectionUpdateHandler === undefined) {
      return;
    }
    setWindowParameters(wp);
    setWindowParametersAsPixels(wpPx);
    brushSelectionUpdateHandler(wp, false, getLogRateAnalysisType(adjustedChartPoints, wp));
  }

  const [mlBrushWidth, setMlBrushWidth] = useState<number>();
  const [mlBrushMarginLeft, setMlBrushMarginLeft] = useState<number>();

  useEffect(() => {
    if (viewMode !== VIEW_MODE.BRUSH) {
      setOriginalWindowParameters(undefined);
      setWindowParameters(undefined);
    }
  }, [viewMode]);

  const isBrushVisible =
    originalWindowParameters &&
    windowParameters &&
    mlBrushMarginLeft &&
    mlBrushWidth &&
    mlBrushWidth > 0;

  // Avoid overlap of brush badges when the brushes are quite narrow.
  const baselineBadgeOverflow = windowParametersAsPixels
    ? getBaselineBadgeOverflow(windowParametersAsPixels, BADGE_WIDTH)
    : 0;
  const baselineBadgeMarginLeft =
    (mlBrushMarginLeft ?? 0) + (windowParametersAsPixels?.baselineMin ?? 0);

  const barColor = barColorOverride ? [barColorOverride] : undefined;
  const barHighlightColor = barHighlightColorOverride ? [barHighlightColorOverride] : ['orange'];

  return (
    <>
      {isBrushVisible && (
        <div className="aiopsHistogramBrushes" data-test-subj={'aiopsHistogramBrushes'}>
          <div css={{ height: BADGE_HEIGHT }}>
            <BrushBadge
              label={
                baselineBrush.label ??
                i18n.translate('xpack.aiops.documentCountChart.baselineBadgeLabel', {
                  defaultMessage: 'Baseline',
                })
              }
              marginLeft={baselineBadgeMarginLeft - baselineBadgeOverflow}
              timestampFrom={windowParameters.baselineMin}
              timestampTo={windowParameters.baselineMax}
              width={baselineBrush.badgeWidth ?? BADGE_WIDTH}
            />
            <BrushBadge
              label={
                deviationBrush.label ??
                i18n.translate('xpack.aiops.documentCountChart.deviationBadgeLabel', {
                  defaultMessage: 'Deviation',
                })
              }
              marginLeft={mlBrushMarginLeft + (windowParametersAsPixels?.deviationMin ?? 0)}
              timestampFrom={windowParameters.deviationMin}
              timestampTo={windowParameters.deviationMax}
              width={deviationBrush.badgeWidth ?? BADGE_WIDTH}
            />
          </div>
          <div
            css={{
              'margin-bottom': '-4px',
            }}
          >
            <DualBrush
              windowParameters={originalWindowParameters}
              min={timeRangeEarliest}
              max={timeRangeLatest + interval}
              onChange={onWindowParametersChange}
              marginLeft={mlBrushMarginLeft}
              snapTimestamps={snapTimestamps}
              width={mlBrushWidth}
            />
          </div>
        </div>
      )}
      <div
        css={{ width: width ?? '100%' }}
        data-test-subj={dataTestSubj ?? 'aiopsDocumentCountChart'}
      >
        <Chart
          size={{
            width: '100%',
            height: height ?? 120,
          }}
        >
          <Settings
            onBrushEnd={viewMode !== VIEW_MODE.BRUSH ? (onBrushEnd as BrushEndListener) : undefined}
            onElementClick={onElementClick}
            onProjectionAreaChange={({ projection }) => {
              setMlBrushMarginLeft(projection.left);
              setMlBrushWidth(projection.width);
            }}
            theme={chartTheme}
            baseTheme={chartBaseTheme}
            debugState={window._echDebugStateFlag ?? false}
            showLegend={false}
            showLegendExtra={false}
            locale={i18n.getLocale()}
          />
          <Axis id="aiops-histogram-left-axis" position={Position.Left} ticks={2} integersOnly />
          <Axis
            id="aiops-histogram-bottom-axis"
            position={Position.Bottom}
            showOverlappingTicks={true}
            tickFormat={(value) => xAxisFormatter.convert(value)}
            labelFormat={useLegacyTimeAxis ? undefined : () => ''}
            timeAxisLayerCount={useLegacyTimeAxis ? 0 : 2}
            style={useLegacyTimeAxis ? {} : MULTILAYER_TIME_AXIS_STYLE}
          />
          {adjustedChartPoints?.length && (
            <HistogramBarSeries
              id={SPEC_ID}
              name={chartPointsSplit ? overallSeriesNameWithSplit : overallSeriesName}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="time"
              yAccessors={['value']}
              data={adjustedChartPoints}
              timeZone={timeZone}
              color={barColor}
              yNice
              styleAccessor={barStyleAccessor}
            />
          )}
          {adjustedChartPointsSplit?.length && (
            <HistogramBarSeries
              id={`${SPEC_ID}_split`}
              name={chartPointsSplitLabel}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="time"
              yAccessors={['value']}
              data={adjustedChartPointsSplit}
              timeZone={timeZone}
              color={barHighlightColor}
              yNice
            />
          )}
          {windowParameters && (
            <>
              <DualBrushAnnotation
                id="aiopsBaseline"
                min={windowParameters.baselineMin}
                max={windowParameters.baselineMax}
                style={baselineBrush.annotationStyle}
              />
              <DualBrushAnnotation
                id="aiopsDeviation"
                min={windowParameters.deviationMin}
                max={windowParameters.deviationMax}
                style={deviationBrush.annotationStyle}
              />
            </>
          )}
        </Chart>
      </div>
    </>
  );
};
