/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { inRange } from 'lodash';
import { Sticky } from 'react-sticky';
import { XYPlot, XAxis } from 'react-vis';
import LastTickValue from './LastTickValue';
import { Marker } from './Marker';
import { px } from '../../../../style/variables';
import { getDurationFormatter } from '../../../../utils/formatters';
import theme from '@elastic/eui/dist/eui_theme_light.json';

// Remove any tick that is too close to topTraceDuration
const getXAxisTickValues = (tickValues, topTraceDuration) => {
  if (topTraceDuration == null) {
    return tickValues;
  }

  const padding = (tickValues[1] - tickValues[0]) / 2;
  const lowerBound = topTraceDuration - padding;
  const upperBound = topTraceDuration + padding;

  return tickValues.filter(value => {
    const isInRange = inRange(value, lowerBound, upperBound);
    return !isInRange && value !== topTraceDuration;
  });
};

function TimelineAxis({ plotValues, marks, topTraceDuration }) {
  const { margins, tickValues, width, xDomain, xMax, xScale } = plotValues;
  const tickFormatter = getDurationFormatter(xMax);
  const xAxisTickValues = getXAxisTickValues(tickValues, topTraceDuration);
  const topTraceDurationFormatted = tickFormatter(topTraceDuration).formatted;

  return (
    <Sticky disableCompensation>
      {({ style }) => {
        return (
          <div
            style={{
              position: 'absolute',
              borderBottom: `1px solid ${theme.euiColorMediumShade}`,
              height: px(margins.top),
              zIndex: 2,
              width: '100%',
              ...style
            }}
          >
            <XYPlot
              dontCheckIfEmpty
              width={width}
              height={margins.top}
              margin={{
                top: margins.top,
                left: margins.left,
                right: margins.right
              }}
              xDomain={xDomain}
            >
              <XAxis
                hideLine
                orientation="top"
                tickSize={0}
                tickValues={xAxisTickValues}
                tickFormat={time => tickFormatter(time).formatted}
                tickPadding={20}
                style={{
                  text: { fill: theme.euiColorDarkShade }
                }}
              />

              {topTraceDuration > 0 && (
                <LastTickValue
                  x={xScale(topTraceDuration)}
                  value={topTraceDurationFormatted}
                  marginTop={28}
                />
              )}

              {marks.map(mark => (
                <Marker
                  key={mark.id}
                  mark={mark}
                  x={xScale(mark.offset + mark.skew)}
                />
              ))}
            </XYPlot>
          </div>
        );
      }}
    </Sticky>
  );
}

TimelineAxis.propTypes = {
  header: PropTypes.node,
  plotValues: PropTypes.object.isRequired,
  marks: PropTypes.array
};

TimelineAxis.defaultProps = {
  marks: []
};

export default TimelineAxis;
