/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { PartitioningLayout } from './partitioning_layout';
import { StreamRoutingContextProvider } from './state_management/stream_routing_state_machine';

interface ClassicStreamPartitioningProps {
  definition: Streams.ClassicStream.GetResponse;
  refreshDefinition: () => void;
}

export const ClassicStreamPartitioning = ({
  definition,
  refreshDefinition,
}: ClassicStreamPartitioningProps) => {
  const {
    core,
    dependencies,
    services: { telemetryClient },
  } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const { timeState$ } = useTimefilter();

  return (
    <StreamRoutingContextProvider
      definition={definition}
      refreshDefinition={refreshDefinition}
      core={core}
      data={data}
      timeState$={timeState$}
      streamsRepositoryClient={streamsRepositoryClient}
      telemetryClient={telemetryClient}
    >
      <ClassicStreamPartitioningImpl />
    </StreamRoutingContextProvider>
  );
};

const ClassicStreamPartitioningImpl = () => {
  return <PartitioningLayout />;
};
