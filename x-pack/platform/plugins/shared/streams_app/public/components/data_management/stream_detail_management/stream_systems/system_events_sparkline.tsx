/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, System } from '@kbn/streams-schema';

import React, { useMemo } from 'react';
import { PreviewDataSparkPlot } from '../../../stream_detail_significant_events_view/add_significant_event_flyout/common/preview_data_spark_plot';

export const SystemEventsSparkline = ({
  system,
  definition,
}: {
  system: System;
  definition: Streams.all.Definition;
}) => {
  const query = useMemo(
    () => ({
      system: {
        name: system.name,
        filter: system.filter,
      },
      kql: { query: '' },
      id: 'system-events-sparkline',
      title: system.name,
    }),
    [system]
  );
  return (
    <PreviewDataSparkPlot
      showTitle={false}
      definition={definition}
      isQueryValid={true}
      query={query}
      hideAxis={true}
      height={100}
    />
  );
};
