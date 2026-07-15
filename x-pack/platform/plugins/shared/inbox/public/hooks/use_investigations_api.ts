/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS } from '@kbn/inbox-common';
import {
  INBOX_INVESTIGATIONS_URL,
  type ListInvestigationsResponse,
} from '../../common/investigations';
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

export const useInvestigations = () => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.investigations.list(),
    queryFn: async (): Promise<ListInvestigationsResponse> =>
      services.http!.get<ListInvestigationsResponse>(INBOX_INVESTIGATIONS_URL, {
        version: API_VERSIONS.internal.v1,
      }),
    keepPreviousData: true,
    retry: retryOnTransientError,
  });
};
