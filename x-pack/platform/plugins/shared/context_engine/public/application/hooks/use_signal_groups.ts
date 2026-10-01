/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { ListSignalGroupsResponse } from '../../../common/http_api/signals';
import { listSignalGroups } from '../api/signals';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseSignalGroupsResult {
  groups: ListSignalGroupsResponse['groups'];
  isLoading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Fetches the preaggregated grouped-by-tag Signals list
 * (`GET /internal/context_engine/signals/groups`).
 */
export const useSignalGroups = ({
  enabled = true,
}: { enabled?: boolean } = {}): UseSignalGroupsResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error, refetch } = useQuery<ListSignalGroupsResponse, Error>({
    queryKey: contextEngineQueryKeys.signals.groups(),
    queryFn: ({ signal }) => listSignalGroups(http, { signal }),
    enabled,
  });

  return { groups: data?.groups ?? [], isLoading, error: error ?? undefined, refetch };
};
