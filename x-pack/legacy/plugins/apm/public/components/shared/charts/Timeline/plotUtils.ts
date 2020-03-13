/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { scaleLinear } from 'd3-scale';
import { Margins } from './';

export type PlotValues = ReturnType<typeof getPlotValues>;

export function getPlotValues({
  width,
  duration,
  height,
  margins
}: {
  width: number;
  duration: number;
  height: number;
  margins: Margins;
}) {
  const xMin = 0;
  const xMax = duration;
  const xScale = scaleLinear()
    .domain([xMin, xMax])
    .range([margins.left, width - margins.right]);

  return {
    height,
    margins,
    tickValues: xScale.ticks(7),
    width,
    xDomain: xScale.domain(),
    xMax,
    xScale
  };
}
