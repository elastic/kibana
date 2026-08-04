/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryFunctionContext, useQuery } from '@kbn/react-query';
import { useKibana } from './use_kibana';

const SIGNIFICANT_EVENTS_AVAILABILITY_QUERY_KEY = ['significantEventsAvailability'] as const;

/**
 * Returns the optional significantEventsApp start contract and a server-confirmed
 * `isAvailable` flag from `GET /internal/significant_events/availability`.
 *
 * Gate any Significant Events UI behind `isAvailable`. When either the
 * significant_events or significantEventsApp plugin is absent, Streams keeps
 * working and SE UI stays hidden.
 *
 * `isLoading` is true while the availability request is in flight when the
 * significant_events plugin is present — wait on it before navigating away
 * on the basis of `isAvailable`.
 */
export function useSignificantEventsApp() {
  const {
    dependencies: {
      start: { significantEventsApp, significant_events: significantEvents },
    },
  } = useKibana();

  const repositoryClient = significantEvents?.significantEventsRepositoryClient;

  const { data, isLoading, error } = useQuery({
    queryKey: SIGNIFICANT_EVENTS_AVAILABILITY_QUERY_KEY,
    queryFn: ({ signal }: QueryFunctionContext) => {
      if (!repositoryClient) {
        throw new Error('significant_events plugin is not available');
      }
      return repositoryClient.fetch('GET /internal/significant_events/availability', {
        signal: signal ?? null,
      });
    },
    enabled: repositoryClient != null,
  });

  if (repositoryClient == null) {
    return {
      significantEventsApp,
      isAvailable: false,
      isLoading: false,
    };
  }

  // Treat a failed availability request as "not available" so callers hide SE UI
  // instead of proceeding as if it were available.
  // Also require the significantEventsApp UI plugin: without it there is no app to
  // navigate to, even when the server reports the feature available.
  const isAvailable = significantEventsApp != null && (error ? false : data?.available === true);

  return {
    significantEventsApp,
    isAvailable,
    isLoading,
  };
}
