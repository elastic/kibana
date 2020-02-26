/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ScaleType, BarSeries } from '@elastic/charts';

interface Props {
  anomalies: any;
}

export const DurationAnomaliesBar = ({ anomalies }: Props) => {
  const anomaliesBars = [];
  if (anomalies?.buckets) {
    const buckets = anomalies.buckets;
    buckets.forEach((bucket: any) => {
      bucket.records.forEach((record: any) => {
        if (record['monitor.id']?.includes('elastic-co')) {
          anomaliesBars.push({ x: record.timestamp, y: 2000 });
        }
      });
    });
  }

  return (
    <BarSeries
      id="bars"
      xScaleType={ScaleType.Linear}
      yScaleType={ScaleType.Linear}
      xAccessor="x"
      yAccessors={['y']}
      data={anomaliesBars}
    />
  );
};
