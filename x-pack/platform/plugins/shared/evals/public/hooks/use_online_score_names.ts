/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_NAMES_URL,
  type ListOnlineScoreNamesResponse,
} from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

/**
 * Every stored `score.name` for one online evaluation monitor, so alert rules can be
 * created on any stored score, not just the names on the currently loaded page.
 */
export const useOnlineScoreNames = (workflowId: string | undefined) => {
  const { services } = useKibana<{ http: HttpStart }>();

  return useQuery({
    queryKey: queryKeys.onlineEvals.scoreNames(workflowId ?? ''),
    queryFn: async (): Promise<ListOnlineScoreNamesResponse> =>
      services.http.get<ListOnlineScoreNamesResponse>(EVALS_ONLINE_SCORES_NAMES_URL, {
        query: { monitor_id: workflowId },
        version: API_VERSIONS.internal.v1,
      }),
    enabled: Boolean(workflowId),
    refetchOnWindowFocus: false,
  });
};
