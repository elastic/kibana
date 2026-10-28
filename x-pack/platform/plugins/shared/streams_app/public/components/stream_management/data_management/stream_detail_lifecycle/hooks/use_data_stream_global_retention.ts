/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../../hooks/use_streams_app_fetch';

export interface DataStreamGlobalRetention {
  defaultRetentionPeriod?: string;
  maximumRetentionPeriod?: string;
}

// Fetches the cluster-wide default/maximum data retention for a stream lifecycle (opt-in).
export function useDataStreamGlobalRetention(
  streamName: string,
  shouldFetch: boolean
): DataStreamGlobalRetention {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const result = useStreamsAppFetch(
    async ({ signal }) => {
      if (!shouldFetch) {
        return undefined;
      }

      const response = await streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/lifecycle/_global_retention',
        {
          signal,
          params: {
            path: { name: streamName },
          },
        }
      );
      return {
        defaultRetentionPeriod: response.default_retention,
        maximumRetentionPeriod: response.max_retention,
      };
    },
    [streamsRepositoryClient, streamName, shouldFetch],
    { disableToastOnError: true }
  );

  return {
    defaultRetentionPeriod: result.value?.defaultRetentionPeriod,
    maximumRetentionPeriod: result.value?.maximumRetentionPeriod,
  };
}
