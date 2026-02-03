/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CoreStart, HttpStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type {
  CloudConnector,
  CloudConnectorListOptions,
  CloudProvider,
  AccountType,
} from '../../../types';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../../../common';
import { CLOUD_CONNECTOR_API_ROUTES } from '../../../constants';

export interface CloudConnectorQueryFilterOptions {
  cloudProvider?: CloudProvider;
  accountType?: AccountType;
}

const fetchCloudConnectors = async (
  http: HttpStart,
  options?: CloudConnectorListOptions
): Promise<CloudConnector[]> => {
  const query: Record<string, string> = {};

  if (options?.page !== undefined) {
    query.page = options.page.toString();
  }

  if (options?.perPage !== undefined) {
    query.perPage = options.perPage.toString();
  }

  if (options?.kuery) {
    query.kuery = options.kuery;
  }

  return http
    .get<{ items: CloudConnector[] }>(CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN, {
      query,
    })
    .then((res: { items: CloudConnector[] }) => res.items);
};

export const useGetCloudConnectors = (filterOptions?: CloudConnectorQueryFilterOptions) => {
  const CLOUD_CONNECTOR_QUERY_KEY = 'get-cloud-connectors';
  const { http } = useKibana<CoreStart>().services;

  // Construct KQL query from filter options
  const kuery = filterOptions
    ? Object.entries(filterOptions)
        .map(([key, value]) =>
          value ? `${CLOUD_CONNECTOR_SAVED_OBJECT_TYPE}.attributes.${key}: "${value}"` : null
        )
        .filter(Boolean)
        .join(' AND ')
    : undefined;

  return useQuery(
    [CLOUD_CONNECTOR_QUERY_KEY, filterOptions?.cloudProvider, filterOptions?.accountType],
    () => fetchCloudConnectors(http, { kuery }),
    {
      enabled: true,
    }
  );
};
