/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type { SigEvent, EventLifecycleResponse } from '@kbn/streams-schema';
import type { PaginatedResponse } from '@kbn/streams-plugin/common';
import { useKibana } from '../use_kibana';
import { useFetchErrorToast } from '../use_fetch_error_toast';

interface UseFetchSigEventsParams {
  from: string | number;
  to: string | number;
  verdict?: string[];
  stream?: string[];
  search?: string;
}

export const useFetchSigEvents = ({
  from,
  to,
  verdict,
  stream,
  search,
}: UseFetchSigEventsParams) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  const [pagination, setPagination] = useState({ page: 1, perPage: 25 });

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [from, to, verdict, stream, search]);

  const query = useQuery<PaginatedResponse<SigEvent>, Error>({
    queryKey: ['sigEvents', pagination.page, pagination.perPage, from, to, verdict, stream, search],
    queryFn: async ({ signal }: QueryFunctionContext): Promise<PaginatedResponse<SigEvent>> => {
      return streamsRepositoryClient.fetch('GET /internal/sig_events/events', {
        params: {
          query: {
            page: pagination.page,
            perPage: pagination.perPage,
            from: new Date(from).toISOString(),
            to: new Date(to).toISOString(),
            ...(verdict?.length ? { verdict } : {}),
            ...(stream?.length ? { stream } : {}),
            ...(search ? { search } : {}),
          },
        },
        signal: signal ?? null,
      });
    },
    onError: showFetchErrorToast,
  });

  return { ...query, pagination, setPagination };
};

export const useFetchEventLifecycle = (eventId: string | undefined) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const showFetchErrorToast = useFetchErrorToast();

  return useQuery<EventLifecycleResponse, Error>({
    queryKey: ['sigEventLifecycle', eventId],
    queryFn: async ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /internal/sig_events/events/{id}/lifecycle', {
        params: { path: { id: eventId! } },
        signal: signal ?? null,
      });
    },
    enabled: !!eventId,
    onError: showFetchErrorToast,
  });
};
