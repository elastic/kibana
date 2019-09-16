/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  Axis,
  Chart,
  HistogramBarSeries,
  ScaleType,
} from '@elastic/charts';

export function FieldHistogram({ data }) {
  if (!data) {
    return null;
  }

  return (
    <div style={{ height: '150px' }}>
      <Chart size="100%">
        <Axis
          id="countAxis"
          position="left"
          ticks={3}
        />
        <HistogramBarSeries
          id="fieldHistogram"
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={data}
        />
      </Chart>
    </div>
  );
}
