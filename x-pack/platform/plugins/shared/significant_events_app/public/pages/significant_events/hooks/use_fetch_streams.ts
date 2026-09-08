/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import { useFetchErrorToast } from '../../../hooks/use_fetch_error_toast';
import { useKibana } from '../../../hooks/use_kibana';

interface StreamsFetchResult {
  streams: ListStreamDetail[];
}

export function useFetchStreams(
  options: {
    select?: (result: StreamsFetchResult) => StreamsFetchResult;
  } = {}
) {
  const {
    core: {
      application: {
        capabilities: { streams },
      },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();
  const canReadStreams = streams?.show === true;

  const fetchStreams = async ({ signal }: QueryFunctionContext): Promise<StreamsFetchResult> => {
    // GET /internal/streams is Streams `read_stream` (`capabilities.streams.show`),
    // not a Nightshift engine privilege. Nightshift Management can open without
    // Streams read; skip the list rather than 403 the page.
    return streamsRepositoryClient.fetch('GET /internal/streams', { signal: signal ?? null });
  };

  return useQuery<StreamsFetchResult, Error>({
    queryKey: ['streamList'],
    queryFn: fetchStreams,
    enabled: canReadStreams,
    onError: showFetchErrorToast,
    select: options?.select,
  });
}
