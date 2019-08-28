/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { LineSeries, getSpecId, ScaleType, CurveType } from '@elastic/charts';
import { getCustomColor } from '../common/utils';
import { seriesStyle, LINE_COLOR } from '../common/settings';

interface Props {
  chartData: any[];
}

const SPEC_ID = 'scatter';

const scatterSeriesStyle = {
  ...seriesStyle,
  line: {
    ...seriesStyle.line,
    visible: false,
  },
  point: {
    ...seriesStyle.point,
    visible: true,
  },
};

export const Scatter: FC<Props> = ({ chartData }) => {
  return (
    <LineSeries
      id={getSpecId(SPEC_ID)}
      xScaleType={ScaleType.Time}
      yScaleType={ScaleType.Linear}
      xAccessor={'time'}
      yAccessors={['value']}
      data={chartData}
      yScaleToDataExtent={false}
      curve={CurveType.CURVE_MONOTONE_X}
      lineSeriesStyle={scatterSeriesStyle}
      customSeriesColors={getCustomColor(SPEC_ID, LINE_COLOR)}
    />
  );
};
