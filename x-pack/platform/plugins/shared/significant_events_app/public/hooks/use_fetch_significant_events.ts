/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import type {
  SignificantEventResponse,
  SignificantEventStatus,
  Severity,
} from '@kbn/significant-events-schema';
import type { PaginatedResponse } from '@kbn/streams-plugin/common';
import { useKibana } from './use_kibana';
import { useFetchErrorToast } from './use_fetch_error_toast';

interface UseFetchSignificantEventsParams {
  from: string | number;
  to: string | number;
  status?: SignificantEventStatus[];
  severity?: Severity[];
  stream?: string[];
  search?: string;
  eventId?: string;
}

export const useFetchSignificantEvents = ({
  from,
  to,
  status,
  severity,
  stream,
  search,
  eventId,
}: UseFetchSignificantEventsParams) => {
  const { significantEventsRepositoryClient } = useKibana().dependencies.start.significantEvents;
  const showFetchErrorToast = useFetchErrorToast();

  const [pagination, setPagination] = useState({ page: 1, perPage: 25 });

  useEffect(() => {
    setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [from, to, status, severity, stream, search, eventId]);

  const query = useQuery<PaginatedResponse<SignificantEventResponse>, Error>({
    // Deep-link lookups must not depend on time or filters. DateRangeRedirect writing
    // rangeFrom/rangeTo rematerializes `from`/`to` and would otherwise refetch.
    queryKey: eventId
      ? ['significantEvents', 'event', eventId, pagination.page, pagination.perPage]
      : [
          'significantEvents',
          pagination.page,
          pagination.perPage,
          from,
          to,
          status,
          severity,
          stream,
          search,
        ],
    queryFn: async ({
      signal,
    }: QueryFunctionContext): Promise<PaginatedResponse<SignificantEventResponse>> => {
      const requestQuery = {
        page: pagination.page,
        perPage: pagination.perPage,
        ...(eventId
          ? { event_id: eventId }
          : {
              from: new Date(from).toISOString(),
              to: new Date(to).toISOString(),
              ...(status?.length ? { status } : {}),
              ...(severity?.length ? { severity } : {}),
              ...(stream?.length ? { stream } : {}),
              ...(search ? { search } : {}),
            }),
      };

      return significantEventsRepositoryClient.fetch('GET /internal/significant_events/events', {
        params: {
          query: requestQuery,
        },
        signal: signal ?? null,
      });
    },
    onError: showFetchErrorToast,
  });

  return { ...query, pagination, setPagination };
};
