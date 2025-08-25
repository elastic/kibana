/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { StreamsGraph } from '.';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useKibana } from '../../hooks/use_kibana';

export function StreamDetailRelationshipsView({
  definition,
}: {
  definition: Streams.all.GetResponse;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const streamsListFetch = useStreamsAppFetch(
    async ({ signal }) => {
      const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });
      return streams;
    },
    [streamsRepositoryClient]
  );

  if (streamsListFetch.loading) {
    return <EuiLoadingSpinner />;
  }

  if (!streamsListFetch.value) {
    return null;
  }

  return <StreamsGraph streams={streamsListFetch.value} currentStream={definition.stream} />;
}
