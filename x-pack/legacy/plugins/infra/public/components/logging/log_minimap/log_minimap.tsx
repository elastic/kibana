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

interface Interval {
  end: number;
  start: number;
}

interface DragRecord {
  startY: number;
  currentY: number | null;
}

interface LogMinimapProps {
  className?: string;
  height: number;
  highlightedInterval: Interval | null;
  jumpToTarget: (params: LogEntryTime) => any;
  intervalSize: number;
  summaryBuckets: SummaryBucket[];
  // searchSummaryBuckets?: SearchSummaryBucket[];
  target: number | null;
  width: number;
}

interface LogMinimapState {
  target: number | null;
  drag: DragRecord | null;
  svgPosition: ClientRect;
}

export class LogMinimap extends React.Component<LogMinimapProps, LogMinimapState> {
  constructor(props: LogMinimapProps) {
    super(props);
    this.state = {
      target: props.target,
      drag: null,
      svgPosition: {
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    };
  }

  public static getDerivedStateFromProps({ target }: LogMinimapProps, { drag }: LogMinimapState) {
    if (!drag) return { target };
    return null;
  }

  public handleClick = (event: MouseEvent) => {
    const { svgPosition } = this.state;
    const clickedYPosition = event.clientY - svgPosition.top;
    const clickedTime = Math.floor(this.getYScale().invert(clickedYPosition));

    this.props.jumpToTarget({
      tiebreaker: 0,
      time: clickedTime,
    });
  };

  private handleMouseDown: React.MouseEventHandler<SVGSVGElement> = event => {
    const { clientY } = event;
    const svgPosition = event.currentTarget.getBoundingClientRect();
    this.setState({
      drag: {
        startY: clientY,
        currentY: null,
      },
      svgPosition,
    });
    window.addEventListener('mousemove', this.handleDragMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  };

  private handleMouseUp = (event: MouseEvent) => {
    window.removeEventListener('mousemove', this.handleDragMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    const { drag, svgPosition } = this.state;
    if (!drag || !drag.currentY) {
      this.handleClick(event);
      return;
    }
    const getTime = (pos: number) => Math.floor(this.getYScale().invert(pos));
    const startYPosition = drag.startY - svgPosition.top;
    const endYPosition = event.clientY - svgPosition.top;
    const startTime = getTime(startYPosition);
    const endTime = getTime(endYPosition);
    const timeDifference = endTime - startTime;
    const newTime = (this.props.target || 0) - timeDifference;
    this.setState({ drag: null, target: newTime });
    this.props.jumpToTarget({
      tiebreaker: 0,
      time: newTime,
    });
  };

  private handleDragMove = (event: MouseEvent) => {
    const { drag } = this.state;
    if (!drag) return;
    this.setState({
      drag: {
        ...drag,
        currentY: event.clientY,
      },
    });
  };

  public getYScale = () => {
    const { target } = this.state;
    const { height, intervalSize } = this.props;
    const domainStart = target ? target - intervalSize / 2 : 0;
    const domainEnd = target ? target + intervalSize / 2 : 0;
    return scaleLinear()
      .domain([domainStart, domainEnd])
      .range([0, height]);
  };

  public getPositionOfTime = (time: number) => {
    const { height, intervalSize } = this.props;

    const [minTime] = this.getYScale().domain();

    return ((time - minTime) * height) / intervalSize; //
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
    const { drag } = this.state;
    const [minTime, maxTime] = this.getYScale().domain();
    const minimapTransform = !drag || !drag.currentY ? null : drag.currentY - drag.startY;

    return (
      <svg
        className={className}
        height={height}
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        onMouseDown={this.handleMouseDown}
      >
        <g transform={minimapTransform ? `translate(0, ${minimapTransform})` : undefined}>
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
        </g>
        {highlightedInterval ? (
          <HighlightedInterval
            end={highlightedInterval.end}
            getPositionOfTime={this.getPositionOfTime}
            start={highlightedInterval.start}
            width={width}
          />
        ) : null}
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
      </svg>
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
