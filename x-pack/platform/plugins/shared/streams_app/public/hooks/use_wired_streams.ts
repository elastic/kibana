/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isWiredStreamDefinition } from '@kbn/streams-schema';
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
    async ({ signal }) => streamsRepositoryClient.fetch('GET /api/streams', { signal }),
    [streamsRepositoryClient]
  );

  return {
    wiredStreams: result.value?.streams.filter(isWiredStreamDefinition),
    isLoading: result.loading,
  };
};
