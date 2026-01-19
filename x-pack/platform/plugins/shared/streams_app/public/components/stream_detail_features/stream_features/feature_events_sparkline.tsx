/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, System } from '@kbn/streams-schema';
import type { AbsoluteTimeRange } from '@kbn/es-query';
import React, { useMemo } from 'react';
import { PreviewDataSparkPlot } from '../../stream_detail_significant_events_view/add_significant_event_flyout/common/preview_data_spark_plot';
import { getLast24HoursTimeRange } from '../../../util/time_range';

const BUCKET_SIZE_MINUTES = 30;

export const FeatureEventsSparklineLast24hrs = ({
  feature,
  definition,
  hideAxis = true,
  height = 100,
}: {
  feature: System;
  definition: Streams.all.Definition;
  hideAxis?: boolean;
  height?: number;
}) => {
  const query = useMemo(
    () => ({
      feature: {
        name: feature.name,
        filter: feature.filter,
        type: feature.type,
      },
      kql: { query: '' },
      id: 'feature-events-sparkline',
      title: feature.name,
    }),
    [feature.name, feature.filter, feature.type]
  );

  const { noOfBuckets, timeRange }: { noOfBuckets: number; timeRange: AbsoluteTimeRange } =
    useMemo(() => {
      const absoluteTimeRange = getLast24HoursTimeRange();
      const durationMinutes =
        (new Date(absoluteTimeRange.to).getTime() - new Date(absoluteTimeRange.from).getTime()) /
        (1000 * 60);
      return {
        noOfBuckets: Math.ceil(durationMinutes / BUCKET_SIZE_MINUTES),
        timeRange: absoluteTimeRange,
      };
    }, []);

  return (
    <PreviewDataSparkPlot
      showTitle={false}
      definition={definition}
      isQueryValid={true}
      query={query}
      hideAxis={hideAxis}
      height={height}
      timeRange={timeRange}
      noOfBuckets={noOfBuckets}
    />
  );
};
