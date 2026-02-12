/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../../hooks/use_timefilter';

export function useDiscoveryStreams() {
  const context = useKibana();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = context;

  const { timeState } = useTimefilter();

  return useStreamsAppFetch(
    async ({ signal }) => {
      const response = await streamsRepositoryClient.fetch('GET /internal/streams', {
        signal,
      });

      return {
        ...response,
        /**
         * Significant events discovery for now only works with logs streams.
         */
        streams: response.streams.filter((stream) => stream.stream.name.startsWith('logs')),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [streamsRepositoryClient, , timeState.start, timeState.end]
  );
}
