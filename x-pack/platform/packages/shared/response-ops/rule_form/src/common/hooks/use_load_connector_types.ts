/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { fetchConnectorTypes } from '@kbn/alerts-ui-shared/src/common/apis/fetch_connector_types';

export interface UseLoadConnectorTypesProps {
  http: HttpStart;
  includeSystemActions?: boolean;
  enabled?: boolean;
  featureId?: string;
}

export const useLoadConnectorTypes = (props: UseLoadConnectorTypesProps) => {
  const { http, includeSystemActions, enabled = true, featureId } = props;

  const queryFn = () => {
    return fetchConnectorTypes({ http, featureId, includeSystemActions });
  };

  const { data, isLoading, isFetching, isInitialLoading } = useQuery({
    queryKey: ['useLoadConnectorTypes', includeSystemActions, featureId],
    queryFn,
    refetchOnWindowFocus: false,
    enabled,
  });

  return {
    data,
    isInitialLoading,
    isLoading: isLoading || isFetching,
  };
};
