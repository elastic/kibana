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
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const fetchStreams = async ({ signal }: QueryFunctionContext): Promise<StreamsFetchResult> => {
    // GET /internal/streams is authorized with Streams `read_stream`, not
    // `read_significant_events`. A significantEvents-only role can open this
    // app and still 403 the stream list. Streams read stays required for the
    // Streams tab and Settings stream matching until we add an SE-owned list.
    return streamsRepositoryClient.fetch('GET /internal/streams', { signal: signal ?? null });
  };

  return useQuery<StreamsFetchResult, Error>({
    queryKey: ['streamList'],
    queryFn: fetchStreams,
    onError: showFetchErrorToast,
    select: options?.select,
  });
}
