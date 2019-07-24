/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLinear, scaleTime } from 'd3-scale';
import { area, curveMonotoneY } from 'd3-shape';
import max from 'lodash/fp/max';
import * as React from 'react';

import euiStyled from '../../../../../../common/eui_styled_components';
import { SummaryBucket } from './types';

interface DensityChartProps {
  buckets: SummaryBucket[];
  end: number;
  start: number;
  width: number;
  height: number;
}

export const DensityChart: React.SFC<DensityChartProps> = ({
  buckets,
  start,
  end,
  width,
  height,
}) => {
  if (start >= end || height <= 0 || width <= 0 || buckets.length <= 0) {
    return null;
  }

  const yScale = scaleTime()
    .domain([start, end])
    .range([0, height]);

  const xMax = max(buckets.map(bucket => bucket.entriesCount)) || 0;
  const xScale = scaleLinear()
    .domain([0, xMax])
    .range([0, width / 2]);

  const path = area<SummaryBucket>()
    .x0(xScale(0))
    .x1(bucket => xScale(bucket.entriesCount))
    .y(bucket => yScale((bucket.start + bucket.end) / 2))
    .curve(curveMonotoneY);
  const pathData = path(buckets);

  return (
    <g transform={`translate(${width / 2}, 0)`}>
      <PositiveAreaPath d={pathData || ''} />
      <NegativeAreaPath transform="scale(-1, 1)" d={pathData || ''} />
    </g>
  );
};

const PositiveAreaPath = euiStyled.path`
  fill: ${props =>
    props.theme.darkMode
      ? props.theme.eui.euiColorMediumShade
      : props.theme.eui.euiColorLightShade};
`;

const NegativeAreaPath = euiStyled.path`
  fill: ${props =>
    props.theme.darkMode
      ? props.theme.eui.euiColorLightShade
      : props.theme.eui.euiColorLightestShade};
`;
