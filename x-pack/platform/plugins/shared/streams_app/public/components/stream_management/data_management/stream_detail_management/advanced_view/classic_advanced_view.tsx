/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { EuiSpacer } from '@elastic/eui';
import { StreamDescription } from '../../../../sig_events/stream_detail_systems/stream_description';
import { DeleteStreamPanel } from './delete_stream';
import { useStreamsPrivileges } from '../../../../../hooks/use_streams_privileges';
import { UnmanagedElasticsearchAssets } from './unmanaged_elasticsearch_assets';
import { StreamDiscoveryConfiguration } from '../../../../sig_events/stream_detail_systems/stream_discovery_configuration';
import { useAIFeatures } from '../../../../../hooks/use_ai_features';

export function ClassicAdvancedView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ClassicStream.GetResponse;
  refreshDefinition: () => void;
}) {
  const {
    features: { significantEvents },
  } = useStreamsPrivileges();
  const aiFeatures = useAIFeatures();

  const isReplicated = definition.replicated === true;

  return (
    <>
      {significantEvents?.enabled && significantEvents?.available ? (
        <>
          <StreamDescription
            definition={definition}
            refreshDefinition={refreshDefinition}
            aiFeatures={aiFeatures}
          />
          <EuiSpacer />
          <StreamDiscoveryConfiguration definition={definition.stream} aiFeatures={aiFeatures} />
          <EuiSpacer />
        </>
      ) : null}
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
