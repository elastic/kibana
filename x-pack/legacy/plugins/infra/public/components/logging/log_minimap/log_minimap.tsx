/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLinear } from 'd3-scale';
import * as React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { LogEntryTime } from '../../../../common/log_entry';
import { DensityChart } from './density_chart';
import { HighlightedInterval } from './highlighted_interval';
import { SearchMarkers } from './search_markers';
import { TimeRuler } from './time_ruler';
import { SummaryBucket, SummaryHighlightBucket } from './types';

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
  summaryHighlightBuckets?: SummaryHighlightBucket[];
  target: number | null;
  width: number;
}

interface LogMinimapState {
  target: number | null;
  drag: DragRecord | null;
  svgPosition: ClientRect;
  timeCursorY: number;
}

function calculateYScale(target: number | null, height: number, intervalSize: number) {
  const domainStart = target ? target - intervalSize / 2 : 0;
  const domainEnd = target ? target + intervalSize / 2 : 0;
  return scaleLinear()
    .domain([domainStart, domainEnd])
    .range([0, height]);
}

export class LogMinimap extends React.Component<LogMinimapProps, LogMinimapState> {
  constructor(props: LogMinimapProps) {
    super(props);
    this.state = {
      timeCursorY: 0,
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

  private dragTargetArea: SVGElement | null = null;

  public static getDerivedStateFromProps({ target }: LogMinimapProps, { drag }: LogMinimapState) {
    if (!drag) {
      return { target };
    }
    return null;
  }

  public handleClick = (event: MouseEvent) => {
    if (!this.dragTargetArea) return;
    const svgPosition = this.dragTargetArea.getBoundingClientRect();
    const clickedYPosition = event.clientY - svgPosition.top;
    const clickedTime = Math.floor(this.getYScale().invert(clickedYPosition));
    this.setState({
      drag: null,
    });
    this.props.jumpToTarget({
      tiebreaker: 0,
      time: clickedTime,
    });
  };

  private handleMouseDown: React.MouseEventHandler<SVGSVGElement> = event => {
    const { clientY, target } = event;
    if (target === this.dragTargetArea) {
      const svgPosition = event.currentTarget.getBoundingClientRect();
      this.setState({
        drag: {
          startY: clientY,
          currentY: null,
        },
        svgPosition,
      });
      window.addEventListener('mousemove', this.handleDragMove);
    }
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
    return calculateYScale(target, height, intervalSize);
  };

  public getPositionOfTime = (time: number) => {
    const { height, intervalSize } = this.props;

    const [minTime] = this.getYScale().domain();

    return ((time - minTime) * height) / intervalSize; //
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
      jumpToTarget,
      summaryBuckets,
      summaryHighlightBuckets,
      width,
      intervalSize,
    } = this.props;
    const { timeCursorY, drag, target } = this.state;
    // Render the time ruler and density map beyond the visible range of time, so that
    // the user doesn't run out of ruler when they click and drag
    const overscanHeight = Math.round(window.screen.availHeight * 2.5) || height * 3;
    const [minTime, maxTime] = calculateYScale(
      target,
      overscanHeight,
      intervalSize * (overscanHeight / height)
    ).domain();
    const tickCount = height ? Math.round((overscanHeight / height) * 144) : 12;
    const overscanTranslate = height ? -(overscanHeight - height) / 2 : 0;
    const dragTransform = !drag || !drag.currentY ? 0 : drag.currentY - drag.startY;
    return (
      <MinimapWrapper
        className={className}
        height={height}
        preserveAspectRatio="none"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.updateTimeCursor}
        showOverscanBoundaries={Boolean(height && summaryBuckets.length)}
      >
        <g transform={`translate(0, ${dragTransform + overscanTranslate})`}>
          <DensityChart
            buckets={summaryBuckets}
            start={minTime}
            end={maxTime}
            width={width}
            height={overscanHeight}
          />

          <MinimapBorder x1={width / 3} y1={0} x2={width / 3} y2={overscanHeight} />
          <TimeRuler
            start={minTime}
            end={maxTime}
            width={width}
            height={overscanHeight}
            tickCount={tickCount}
          />
        </g>
        {highlightedInterval ? (
          <HighlightedInterval
            end={highlightedInterval.end}
            getPositionOfTime={this.getPositionOfTime}
            start={highlightedInterval.start}
            width={width}
            target={target}
          />
        ) : null}
        <g transform={`translate(${width * 0.5}, 0)`}>
          <SearchMarkers
            buckets={summaryHighlightBuckets || []}
            start={minTime}
            end={maxTime}
            width={width / 2}
            height={height}
            jumpToTarget={jumpToTarget}
          />
        </g>
        <TimeCursor x1={width / 3} x2={width} y1={timeCursorY} y2={timeCursorY} />
        <DragTargetArea
          isGrabbing={Boolean(drag)}
          ref={node => {
            this.dragTargetArea = node;
          }}
          x={0}
          y={0}
          width={width / 3}
          height={height}
        />
      </MinimapWrapper>
    );
  }
}

const DragTargetArea = euiStyled.rect<{ isGrabbing: boolean }>`
  fill: transparent;
  cursor: ${({ isGrabbing }) => (isGrabbing ? 'grabbing' : 'grab')};
`;

const MinimapBorder = euiStyled.line`
  stroke: ${props => props.theme.eui.euiColorMediumShade};
  stroke-width: 1px;
`;

const TimeCursor = euiStyled.line`
  pointer-events: none;
  stroke-width: 1px;
  stroke: ${props =>
    props.theme.darkMode
      ? props.theme.eui.euiColorDarkestShade
      : props.theme.eui.euiColorDarkShade};
`;

const MinimapWrapper = euiStyled.svg<{ showOverscanBoundaries: boolean }>`
  background: ${props =>
    props.showOverscanBoundaries ? props.theme.eui.euiColorMediumShade : 'transparent'};
  & ${TimeCursor} {
    visibility: hidden;
  }
  &:hover ${TimeCursor} {
    visibility: visible;
  }
`;
