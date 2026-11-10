/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { hasClassicOrWiredStreams } from './tab_ids';

export const CLASSIC_TAB_QUERY_KEY = ['streams', 'classicTabStreams'];

/** Shows the Classic tab to users with both experiences, unless the check finds no streams. */
export function useShowClassicTab(): { loading: boolean; showClassic: boolean } {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const {
    access: { legacy, v2 },
  } = useStreamsPrivileges();
  const enabled = legacy && v2;

  const { data, isLoading } = useQuery({
    queryKey: CLASSIC_TAB_QUERY_KEY,
    queryFn: ({ signal }) =>
      streamsRepositoryClient.fetch('GET /api/streams 2023-10-31', { signal: signal ?? null }),
    select: ({ streams }) => hasClassicOrWiredStreams(streams),
    enabled,
    // One check per Streams app mount (AppRoot drops the answer), also after a failure: V1 is
    // GA, so a failed check keeps the tab.
    staleTime: Infinity,
    cacheTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    // A disabled query also reports isLoading.
    loading: enabled && isLoading,
    showClassic: enabled && data !== false,
  };
}
