/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LineSeries, CurveType } from '@elastic/charts';
import { LocationDurationLine } from '../../../../common/graphql/types';
import { getColorsMap } from './get_colors_map';
import { convertMicrosecondsToMilliseconds as microsToMillis } from '../../../lib/helper';

interface Props {
  lines: LocationDurationLine[];
  meanColor: string;
}

export const DurationLineSeriesList = ({ lines, meanColor }: Props) => (
  <>
    {lines.map(({ name, line }) => (
      <LineSeries
        curve={CurveType.CURVE_MONOTONE_X}
        // this id is used for the line chart representing the average duration length
        customSeriesColors={getColorsMap(meanColor, `average-${name}`)}
        data={line.map(({ x, y }) => [x, microsToMillis(y || null)])}
        id={`loc-avg-${name}`}
        key={`locline-${name}`}
        name={name}
        xAccessor={0}
        xScaleType="time"
        yAccessors={[1]}
        yScaleToDataExtent={false}
        yScaleType="linear"
      />
    ))}
  </>
);
