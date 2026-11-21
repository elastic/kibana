/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, EVALS_ONLINE_SCORES_PRIVILEGES_URL } from '@kbn/evals-common';
import { queryKeys } from '../query_keys';

interface OnlineScoresPrivilegesResponse {
  has_read: boolean;
}

/** Whether the current user can read the online scores index that alert rules query. */
export const useOnlineScoresPrivileges = (enabled: boolean) => {
  const { services } = useKibana<{ http: HttpStart }>();

  return useQuery({
    queryKey: queryKeys.onlineEvals.privileges(),
    queryFn: async (): Promise<OnlineScoresPrivilegesResponse> =>
      services.http.get<OnlineScoresPrivilegesResponse>(EVALS_ONLINE_SCORES_PRIVILEGES_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    enabled,
    refetchOnWindowFocus: false,
  });
};
