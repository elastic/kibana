/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { fetchConnectors } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connectors';

export interface UseLoadConnectorsProps {
  http: HttpStart;
  includeSystemActions?: boolean;
  enabled?: boolean;
  cacheTime?: number;
}

export const useLoadConnectors = (props: UseLoadConnectorsProps) => {
  const { http, includeSystemActions = false, enabled = true, cacheTime } = props;

  const queryFn = () => {
    return fetchConnectors({ http, includeSystemActions });
  };

  const { data, isLoading, isFetching, isInitialLoading } = useQuery({
    queryKey: ['useLoadConnectors', includeSystemActions],
    queryFn,
    cacheTime,
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data,
    isInitialLoading,
    isLoading: isLoading || isFetching,
  };
};
