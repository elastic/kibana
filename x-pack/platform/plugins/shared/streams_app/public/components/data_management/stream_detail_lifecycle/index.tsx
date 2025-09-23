/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { StreamDetailGeneralData } from './general_data';

export function StreamDetailLifecycle({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <StreamDetailGeneralData definition={definition} refreshDefinition={refreshDefinition} />
    </EuiFlexGroup>
  );
}
