/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { API_VERSIONS } from '@kbn/inbox-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { buildInvestigationUrl, type InvestigationDetail } from '../../common/investigations';
import { queryKeys } from '../query_keys';

const retryOnTransientError = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 3) {
    return false;
  }
  if (isHttpFetchError(error)) {
    return !error.response?.status || error.response.status >= 500;
  }
  return true;
};

export const useInvestigation = (conversationId: string | undefined) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.investigations.detail(conversationId),
    queryFn: async (): Promise<InvestigationDetail> =>
      services.http!.get<InvestigationDetail>(buildInvestigationUrl(conversationId!), {
        version: API_VERSIONS.internal.v1,
      }),
    enabled: Boolean(conversationId),
    retry: retryOnTransientError,
  });
};
