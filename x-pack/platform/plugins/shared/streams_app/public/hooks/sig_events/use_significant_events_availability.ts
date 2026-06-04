/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

const SIGNIFICANT_EVENTS_AVAILABILITY_QUERY_KEY = ['significantEventsAvailability'] as const;

export const useSignificantEventsAvailability = () => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { data, isLoading } = useQuery({
    queryKey: SIGNIFICANT_EVENTS_AVAILABILITY_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) =>
      streamsRepositoryClient.fetch('GET /internal/sig_events/availability', {
        signal: signal ?? null,
      }),
  });

  return { isAvailable: data?.available, isLoading };
};
