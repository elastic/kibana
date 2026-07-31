/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { EventLifecycleResponse } from '@kbn/significant-events-schema';
import { useKibana } from '../use_kibana';
import { useFetchErrorToast } from '../use_fetch_error_toast';

export const useFetchSignificantEventLifecycle = (eventUuid: string | undefined) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery<EventLifecycleResponse, Error>({
    queryKey: ['significantEventLifecycle', eventUuid],
    queryFn: async ({ signal }: QueryFunctionContext) => {
      return streamsRepositoryClient.fetch(
        'GET /internal/significant_events/events/{id}/lifecycle',
        {
          params: { path: { id: eventUuid! } },
          signal: signal ?? null,
        }
      );
    },
    enabled: !!eventUuid,
    onError: showFetchErrorToast,
  });
};
