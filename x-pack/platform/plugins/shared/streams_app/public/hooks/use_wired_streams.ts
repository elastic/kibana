/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { useKibana } from './use_kibana';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export const useWiredStreams = () => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async ({ signal }) => streamsRepositoryClient.fetch('GET /internal/streams', { signal }),
    [streamsRepositoryClient]
  );

  return {
    wiredStreams: result.value?.streams.filter((s): s is ListStreamDetail =>
      Streams.WiredStream.Definition.is(s.stream)
    ),
    isLoading: result.loading,
  };
};
