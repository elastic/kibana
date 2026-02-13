/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';

export interface CloudConnectorUsageItem {
  id: string;
  name: string;
  package?: {
    name: string;
    title: string;
    version: string;
  };
  policy_ids: string[];
  created_at: string;
  updated_at: string;
}

interface CloudConnectorUsageResponse {
  items: CloudConnectorUsageItem[];
  total: number;
  page: number;
  perPage: number;
}

const fetchCloudConnectorUsage = async (
  http: HttpStart,
  cloudConnectorId: string,
  page: number,
  perPage: number
): Promise<CloudConnectorUsageResponse> => {
  const path = CLOUD_CONNECTOR_API_ROUTES.USAGE_PATTERN.replace(
    '{cloudConnectorId}',
    cloudConnectorId
  );

  return http.get<CloudConnectorUsageResponse>(path, {
    query: {
      page,
      perPage,
    },
  });
};

export interface UseCloudConnectorUsageOptions {
  staleTime?: number;
}

export const useCloudConnectorUsage = (
  cloudConnectorId: string,
  page: number = 1,
  perPage: number = 10,
  options?: UseCloudConnectorUsageOptions
) => {
  const CLOUD_CONNECTOR_USAGE_QUERY_KEY = 'cloud-connector-usage';
  const { http } = useKibana().services;

  return useQuery(
    [CLOUD_CONNECTOR_USAGE_QUERY_KEY, cloudConnectorId, page, perPage],
    () => {
      if (!http) {
        throw new Error('HTTP service is not available');
      }
      return fetchCloudConnectorUsage(http, cloudConnectorId, page, perPage);
    },
    {
      enabled: !!cloudConnectorId,
      keepPreviousData: true, // Keep previous data to avoid flashing when going through pages
      staleTime: options?.staleTime ?? 60000, // Default: cache for 1 minute
      refetchOnWindowFocus: false,
    }
  );
};
