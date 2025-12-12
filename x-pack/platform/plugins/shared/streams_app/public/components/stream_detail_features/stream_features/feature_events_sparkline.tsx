/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, Feature } from '@kbn/streams-schema';
import type { AbsoluteTimeRange } from '@kbn/es-query';
import React, { useMemo } from 'react';
import { PreviewDataSparkPlot } from '../../stream_detail_significant_events_view/add_significant_event_flyout/common/preview_data_spark_plot';

export const FeatureEventsSparkline = ({
  feature,
  definition,
  hideAxis = true,
  height = 100,
  timeRange,
}: {
  feature: Feature;
  definition: Streams.all.Definition;
  hideAxis?: boolean;
  height?: number;
  timeRange?: AbsoluteTimeRange;
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

  return (
    <PreviewDataSparkPlot
      showTitle={false}
      definition={definition}
      isQueryValid={true}
      query={query}
      hideAxis={hideAxis}
      height={height}
      timeRange={timeRange}
    />
  );
};

export const FeatureEventsSparklineLast24hrs = ({
  feature,
  definition,
  hideAxis = true,
  height = 100,
}: {
  feature: Feature;
  definition: Streams.all.Definition;
  hideAxis?: boolean;
  height?: number;
}) => {
  const timeRange: AbsoluteTimeRange = useMemo(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
      from: from.toISOString(),
      to: now.toISOString(),
      mode: 'absolute',
    };
  }, []);

  return (
    <FeatureEventsSparkline
      feature={feature}
      definition={definition}
      hideAxis={hideAxis}
      height={height}
      timeRange={timeRange}
    />
  );
};
