/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleTime } from 'd3-scale';
import * as React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';

interface TimeRulerProps {
  end: number;
  height: number;
  start: number;
  tickCount: number;
  width: number;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({ end, height, start, tickCount, width }) => {
  const yScale = scaleTime()
    .domain([start, end])
    .range([0, height]);

  const ticks = yScale.ticks(tickCount);
  const formatTick = yScale.tickFormat();

  const dateModLabel = (() => {
    for (let i = 0; i < ticks.length; i++) {
      const tickLabel = formatTick(ticks[i]);
      if (!tickLabel[0].match(/[0-9]/)) {
        return i % 12;
      }
    }
  })();

  return (
    <g>
      {ticks.map((tick, tickIndex) => {
        const y = yScale(tick);
        const isLabeledTick = tickIndex % 12 === dateModLabel;
        const tickStartX = isLabeledTick ? 0 : width / 3 - 4;
        return (
          <g key={`tick${tickIndex}`}>
            {isLabeledTick && (
              <TimeRulerTickLabel x={0} y={y - 4}>
                {formatTick(tick)}
              </TimeRulerTickLabel>
            )}
            <TimeRulerGridLine
              isDark={isLabeledTick}
              x1={tickStartX}
              y1={y}
              x2={width / 3}
              y2={y}
            />
          </g>
        );
      })}
    </g>
  );
};

TimeRuler.displayName = 'TimeRuler';

const TimeRulerTickLabel = euiStyled.text`
  font-size: 9px;
  line-height: ${props => props.theme.eui.euiLineHeight};
  fill: ${props => props.theme.eui.textColors.subdued};
  user-select: none;
  pointer-events: none;
`;

const TimeRulerGridLine = euiStyled.line<{ isDark: boolean }>`
  stroke: ${props =>
    props.isDark
      ? props.theme.darkMode
        ? props.theme.eui.euiColorDarkestShade
        : props.theme.eui.euiColorDarkShade
      : props.theme.darkMode
      ? props.theme.eui.euiColorDarkShade
      : props.theme.eui.euiColorMediumShade};
  stroke-opacity: 0.5;
  stroke-width: 1px;
`;
