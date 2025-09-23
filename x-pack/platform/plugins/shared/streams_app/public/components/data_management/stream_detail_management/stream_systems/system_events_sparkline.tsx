/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, System } from '@kbn/streams-schema';

import React from 'react';
import { PreviewDataSparkPlot } from '../../../stream_detail_significant_events_view/add_significant_event_flyout/common/preview_data_spark_plot';

export const SystemEventsSparkline = ({
  system,
  definition,
}: {
  system: System;
  definition: Streams.all.Definition;
}) => {
  return (
    <PreviewDataSparkPlot
      showTitle={false}
      definition={definition}
      isQueryValid={true}
      query={{
        system,
        kql: { query: '' },
        id: 'system-events-sparkline',
        title: system.name,
      }}
    />
  );
};
