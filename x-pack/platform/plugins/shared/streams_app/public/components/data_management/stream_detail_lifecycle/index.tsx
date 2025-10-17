/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { StreamDetailFailureStore } from './failure_store';
import { StreamDetailGeneralData } from './general_data';
import { useDataStreamStats } from './hooks/use_data_stream_stats';
import { useTimefilter } from '../../../hooks/use_timefilter';

export function StreamDetailLifecycle({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const { timeState } = useTimefilter();
  const data = useDataStreamStats({ definition, timeState });

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <StreamDetailGeneralData
        definition={definition}
        refreshDefinition={refreshDefinition}
        data={data}
      />
      <EuiSpacer size="m" />
      <StreamDetailFailureStore definition={definition} data={data} />
    </EuiFlexGroup>
  );
}
