/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty, flatten } from 'lodash';
import { scaleLinear } from 'd3-scale';
import { XYPlot } from 'react-vis';
import d3 from 'd3';
import PropTypes from 'prop-types';
import React from 'react';

import { unit } from '../../../../style/variables';
import { getTimezoneOffsetInMs } from './getTimezoneOffsetInMs';

const XY_HEIGHT = unit * 16;
const XY_MARGIN = {
  top: unit,
  left: unit * 5,
  right: 0,
  bottom: unit * 2
};

const getXScale = (xMin, xMax, width) => {
  return scaleLinear()
    .domain([xMin, xMax])
    .range([XY_MARGIN.left, width - XY_MARGIN.right]);
};

const getYScale = (yMin, yMax) => {
  return scaleLinear()
    .domain([yMin, yMax])
    .range([XY_HEIGHT, 0])
    .nice();
};

function getFlattenedCoordinates(visibleSeries, enabledSeries) {
  const enabledCoordinates = flatten(enabledSeries.map(serie => serie.data));
  if (!isEmpty(enabledCoordinates)) {
    return enabledCoordinates;
  }

  return flatten(visibleSeries.map(serie => serie.data));
}

export function getPlotValues(
  visibleSeries,
  enabledSeries,
  { width, yMin = 0, yMax = 'max', height, stackBy }
) {
  const flattenedCoordinates = getFlattenedCoordinates(
    visibleSeries,
    enabledSeries
  );

  const xMin = d3.min(flattenedCoordinates, d => d.x);

  const xMax = d3.max(flattenedCoordinates, d => d.x);

  if (yMax === 'max') {
    yMax = d3.max(flattenedCoordinates, d => d.y);
  }
  if (yMin === 'min') {
    yMin = d3.min(flattenedCoordinates, d => d.y);
  }

  const [xMinZone, xMaxZone] = [xMin, xMax].map(x => {
    return x - getTimezoneOffsetInMs(x);
  });

  const xScale = getXScale(xMin, xMax, width);
  const yScale = getYScale(yMin, yMax);

  const yMaxNice = yScale.domain()[1];
  const yTickValues = [0, yMaxNice / 2, yMaxNice];

  // approximate number of x-axis ticks based on the width of the plot. There should by approx 1 tick per 100px
  // d3 will determine the exact number of ticks based on the selected range
  const xTickTotal = Math.floor(width / 100);

  const xTickValues = d3.time.scale
    .utc()
    .domain([xMinZone, xMaxZone])
    .range([0, width])
    .ticks(xTickTotal)
    .map(x => {
      const time = x.getTime();
      return new Date(time + getTimezoneOffsetInMs(time));
    });

  return {
    x: xScale,
    y: yScale,
    xTickValues,
    yTickValues,
    XY_MARGIN,
    XY_HEIGHT: height || XY_HEIGHT,
    XY_WIDTH: width,
    stackBy
  };
}

export function SharedPlot({ plotValues, ...props }) {
  const { XY_HEIGHT: height, XY_MARGIN: margin, XY_WIDTH: width } = plotValues;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0 }}>
      <XYPlot
        dontCheckIfEmpty
        height={height}
        margin={margin}
        xType="time-utc"
        width={width}
        xDomain={plotValues.x.domain()}
        yDomain={plotValues.y.domain()}
        stackBy={plotValues.stackBy}
        {...props}
      />
    </div>
  );
}

SharedPlot.propTypes = {
  plotValues: PropTypes.shape({
    x: PropTypes.func.isRequired,
    y: PropTypes.func.isRequired,
    XY_WIDTH: PropTypes.number.isRequired,
    height: PropTypes.number
  }).isRequired
};
