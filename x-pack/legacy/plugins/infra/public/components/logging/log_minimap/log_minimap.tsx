/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLinear } from 'd3-scale';
import * as React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { LogEntryTime } from '../../../../common/log_entry';
// import { SearchSummaryBucket } from '../../../../common/log_search_summary';
import { DensityChart } from './density_chart';
import { HighlightedInterval } from './highlighted_interval';
// import { SearchMarkers } from './search_markers';
import { TimeRuler } from './time_ruler';
import { SummaryBucket } from './types';

interface LogMinimapProps {
  className?: string;
  height: number;
  highlightedInterval: {
    end: number;
    start: number;
  } | null;
  jumpToTarget: (params: LogEntryTime) => any;
  intervalSize: number;
  summaryBuckets: SummaryBucket[];
  // searchSummaryBuckets?: SearchSummaryBucket[];
  target: number | null;
  width: number;
}

interface LogMinimapState {
  timeCursorY: number;
}

export class LogMinimap extends React.Component<LogMinimapProps, LogMinimapState> {
  public readonly state = {
    timeCursorY: 0,
  };

  public handleClick: React.MouseEventHandler<SVGSVGElement> = event => {
    const svgPosition = event.currentTarget.getBoundingClientRect();
    const clickedYPosition = event.clientY - svgPosition.top;
    const clickedTime = Math.floor(this.getYScale().invert(clickedYPosition));

    this.props.jumpToTarget({
      tiebreaker: 0,
      time: clickedTime,
    });
  };

  public getYScale = () => {
    const { height, intervalSize, target } = this.props;

    const domainStart = target ? target - intervalSize / 2 : 0;
    const domainEnd = target ? target + intervalSize / 2 : 0;
    return scaleLinear()
      .domain([domainStart, domainEnd])
      .range([0, height]);
  };

  public getPositionOfTime = (time: number) => {
    const { height, intervalSize } = this.props;

    const [minTime] = this.getYScale().domain();

    return ((time - minTime) * height) / intervalSize;
  };

  private updateTimeCursor: React.MouseEventHandler<SVGSVGElement> = event => {
    const svgPosition = event.currentTarget.getBoundingClientRect();
    const timeCursorY = event.clientY - svgPosition.top;

    this.setState({ timeCursorY });
  };

  public render() {
    const {
      className,
      height,
      highlightedInterval,
      // jumpToTarget,
      summaryBuckets,
      // searchSummaryBuckets,
      width,
    } = this.props;

    const { timeCursorY } = this.state;

    const [minTime, maxTime] = this.getYScale().domain();

    return (
      <MinimapWrapper
        className={className}
        height={height}
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        onClick={this.handleClick}
        onMouseMove={this.updateTimeCursor}
      >
        <MinimapBackground x={width / 2} y="0" width={width / 2} height={height} />
        <DensityChart
          buckets={summaryBuckets}
          start={minTime}
          end={maxTime}
          width={width}
          height={height}
        />
        <MinimapBorder x1={width / 2} y1={0} x2={width / 2} y2={height} />
        <TimeRuler start={minTime} end={maxTime} width={width} height={height} tickCount={12} />
        {highlightedInterval ? (
          <HighlightedInterval
            end={highlightedInterval.end}
            getPositionOfTime={this.getPositionOfTime}
            start={highlightedInterval.start}
            width={width}
          />
        ) : null}
        <TimeCursor x1={0} x2={width} y1={timeCursorY} y2={timeCursorY} />
        {/* <g transform={`translate(${width * 0.5}, 0)`}>
          <SearchMarkers
            buckets={searchSummaryBuckets || []}
            start={minTime}
            end={maxTime}
            width={width / 2}
            height={height}
            jumpToTarget={jumpToTarget}
          />
        </g> */}
      </MinimapWrapper>
    );
  }
}

const MinimapBackground = euiStyled.rect`
  fill: ${props => props.theme.eui.euiColorLightestShade};
`;

const MinimapBorder = euiStyled.line`
  stroke: ${props => props.theme.eui.euiColorMediumShade};
  stroke-width: 1px;
`;

const TimeCursor = euiStyled.line`
  stroke-width: 1px;
  stroke: ${props =>
    props.theme.darkMode
      ? props.theme.eui.euiColorDarkestShade
      : props.theme.eui.euiColorDarkShade};
`;

const MinimapWrapper = euiStyled.svg`
  & ${TimeCursor} {
    visibility: hidden;
  }
  &:hover ${TimeCursor} {
    visibility: visible;
  }
`;
