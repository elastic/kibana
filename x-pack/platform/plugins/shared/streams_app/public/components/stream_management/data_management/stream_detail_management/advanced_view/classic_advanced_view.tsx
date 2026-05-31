/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { EuiSpacer } from '@elastic/eui';
import { DeleteStreamPanel } from './delete_stream';
import { UnmanagedElasticsearchAssets } from './unmanaged_elasticsearch_assets';

export function ClassicAdvancedView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ClassicStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const isReplicated = definition.replicated === true;

  return (
    <>
      {!isReplicated && (
        <>
          <UnmanagedElasticsearchAssets
            definition={definition}
            refreshDefinition={refreshDefinition}
          />
          <EuiSpacer />
          <DeleteStreamPanel definition={definition} />
        </>
      )}
      <EuiSpacer />
    </>
  );
}
