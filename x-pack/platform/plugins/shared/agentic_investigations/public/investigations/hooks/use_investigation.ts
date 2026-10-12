/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import { AGENTIC_INVESTIGATIONS_API_VERSION, INVESTIGATION_BY_ID_URL } from '../../../common';
import type { Investigation } from '../../../common';
import { retryOnTransientError } from '../../retry_on_transient_error';
import { investigationQueryKeys } from '../query_keys';

/** How often an investigation an agent is working on is read again. */
export const IN_PROGRESS_REFETCH_INTERVAL_MS = 5_000;

export const fetchInvestigation = (
  http: HttpStart,
  id: string,
  signal?: AbortSignal
): Promise<Investigation> =>
  http.get<Investigation>(INVESTIGATION_BY_ID_URL.replace('{id}', encodeURIComponent(id)), {
    version: AGENTIC_INVESTIGATIONS_API_VERSION,
    signal,
  });

/**
 * Reads an investigation from the shared query API and reads it again every few seconds while an
 * Agent Builder execution runs for it, so findings appear as they are recorded.
 */
export const useInvestigation = (id: string) => {
  const {
    services: { http },
  } = useKibana<CoreStart>();

  return useQuery({
    queryKey: investigationQueryKeys.detail(id),
    queryFn: ({ signal }) => fetchInvestigation(http, id, signal),
    refetchInterval: (data: Investigation | undefined) =>
      data?.in_progress ? IN_PROGRESS_REFETCH_INTERVAL_MS : false,
    retry: retryOnTransientError,
  });
};
