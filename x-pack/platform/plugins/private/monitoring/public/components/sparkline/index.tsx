/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { isEqual } from 'lodash';
import { transparentize } from 'polished';
import { euiFontSize } from '@elastic/eui';

import { SparklineFlotChart } from './sparkline_flot_chart';

export interface TooltipDataPoint {
  xValue: number;
  yValue: number;
  xPosition: number;
  yPosition: number;
  plotTop: number;
  plotLeft: number;
  plotHeight: number;
  plotWidth: number;
}

export interface SparklineTooltipConfig {
  enabled?: boolean;
  xValueFormatter: (value: number) => string | number;
  yValueFormatter: (value: number) => string | number;
}

interface SparklineOptions {
  xaxis?: {
    min?: number;
    max?: number;
  };
}

interface SparklineProps {
  series: number[][];
  tooltip: SparklineTooltipConfig;
  options?: SparklineOptions;
  onBrush?: (range: unknown) => void;
}

const TOOLTIP_HEIGHT_PX = 56;
const TOOLTIP_WIDTH_PX = 220;
const CARET_WIDTH_PX = 6;
const MARGIN_BETWEEN_POINT_AND_CARET_PX = 10;

const sparklineTooltipStyle = (theme: Parameters<typeof euiFontSize>[0]) => css`
  font-weight: ${theme.euiTheme.font.weight.regular};
  background: ${transparentize(0.3, theme.euiTheme.colors.darkestShade)};
  font-size: ${euiFontSize(theme, 'xs').fontSize};
  padding: ${theme.euiTheme.size.xs};
  border-radius: ${theme.euiTheme.border.radius.medium};
  pointer-events: none;
`;

const tooltipXValueStyle = ({ euiTheme }: Parameters<typeof euiFontSize>[0]) => css`
  color: ${transparentize(0.3, euiTheme.colors.textGhost)};
`;

const tooltipYValueStyle = ({ euiTheme }: Parameters<typeof euiFontSize>[0]) => css`
  color: ${euiTheme.colors.textGhost};
`;

const tooltipContainerStyle = ({ euiTheme }: Parameters<typeof euiFontSize>[0]) => css`
  position: fixed;
  z-index: ${euiTheme.levels.menu};
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const tooltipCaretStyle = ({ euiTheme }: Parameters<typeof euiFontSize>[0]) => css`
  display: none;
  width: 0;
  height: 0;
  border-top: ${euiTheme.size.s} solid transparent;
  border-bottom: ${euiTheme.size.s} solid transparent;
`;

const tooltipLeftCaretStyle = (theme: Parameters<typeof euiFontSize>[0]) => css`
  ${tooltipCaretStyle(theme)}
  border-right: ${CARET_WIDTH_PX}px solid ${transparentize(
    0.3,
    theme.euiTheme.colors.darkestShade
  )};
`;

const tooltipRightCaretStyle = (theme: Parameters<typeof euiFontSize>[0]) => css`
  ${tooltipCaretStyle(theme)}
  border-left: ${CARET_WIDTH_PX}px solid ${transparentize(0.3, theme.euiTheme.colors.darkestShade)};
`;

export const SparklineTooltip = ({
  tooltip,
  dataPoint,
}: {
  tooltip: SparklineTooltipConfig;
  dataPoint: TooltipDataPoint;
}) => {
  const containerStyle: React.CSSProperties = {
    top: dataPoint.yPosition - TOOLTIP_HEIGHT_PX / 2,
  };
  const leftCaretStyle: React.CSSProperties = {};
  const rightCaretStyle: React.CSSProperties = {};

  const plotMiddleX = dataPoint.plotLeft + dataPoint.plotWidth / 2;
  const tooltipContainerWidth = TOOLTIP_WIDTH_PX + CARET_WIDTH_PX;

  if (dataPoint.xPosition > plotMiddleX) {
    rightCaretStyle.display = 'block';
    containerStyle.left =
      dataPoint.xPosition - tooltipContainerWidth - MARGIN_BETWEEN_POINT_AND_CARET_PX;
  } else {
    leftCaretStyle.display = 'block';
    containerStyle.left = dataPoint.xPosition + MARGIN_BETWEEN_POINT_AND_CARET_PX;
  }

  return (
    <div
      className="monSparklineTooltip__container"
      css={tooltipContainerStyle}
      style={containerStyle}
    >
      <span aria-hidden={true} css={tooltipLeftCaretStyle} style={leftCaretStyle} />
      <div
        css={sparklineTooltipStyle}
        style={{ height: TOOLTIP_HEIGHT_PX, width: TOOLTIP_WIDTH_PX }}
      >
        <div css={tooltipYValueStyle}>{tooltip.yValueFormatter(dataPoint.yValue)}</div>
        <div css={tooltipXValueStyle}>{tooltip.xValueFormatter(dataPoint.xValue)}</div>
      </div>
      <span aria-hidden={true} css={tooltipRightCaretStyle} style={rightCaretStyle} />
    </div>
  );
};

export const Sparkline = ({ series, tooltip, options, onBrush }: SparklineProps) => {
  const [dataPoint, setDataPoint] = useState<TooltipDataPoint | undefined>();
  const chartElemRef = useRef<HTMLDivElement | null>(null);
  const flotChartRef = useRef<SparklineFlotChart | null>(null);
  const prevSeriesRef = useRef(series);
  const prevOptionsRef = useRef(options);

  const onHover = useCallback((point?: TooltipDataPoint) => {
    setDataPoint(point);
  }, []);

  const handleSparklineRef = useCallback(
    (elem: HTMLDivElement | null) => {
      chartElemRef.current = elem;
      if (elem) {
        flotChartRef.current = new SparklineFlotChart(elem, series, onBrush, onHover, options);
      } else if (flotChartRef.current) {
        flotChartRef.current.shutdown();
        flotChartRef.current = null;
      }
    },
    // Intentionally stable: the ref callback captures `series`, `onBrush`, `onHover`, and
    // `options` at mount time only. Subsequent prop changes are handled by the `useEffect`
    // below, which calls `flotChartRef.current.update()` or recreates the chart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (!flotChartRef.current) {
      return;
    }

    if (!isEqual(options, prevOptionsRef.current)) {
      flotChartRef.current.shutdown();
      flotChartRef.current = new SparklineFlotChart(
        chartElemRef.current,
        series,
        onBrush,
        onHover,
        options
      );
    } else if (!isEqual(series, prevSeriesRef.current)) {
      flotChartRef.current.update(series);
    }

    prevSeriesRef.current = series;
    prevOptionsRef.current = options;
  }, [series, options, onBrush, onHover]);

  useEffect(() => {
    return () => {
      flotChartRef.current?.shutdown();
    };
  }, []);

  const showTooltip = tooltip.enabled !== false && dataPoint !== undefined;

  return (
    <div>
      <div css={{ height: '2em' }} ref={handleSparklineRef} />
      {showTooltip && <SparklineTooltip {...{ tooltip, dataPoint }} />}
    </div>
  );
};
