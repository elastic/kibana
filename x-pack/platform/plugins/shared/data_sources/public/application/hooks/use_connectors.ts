/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';
import type { Connector } from '../../types/connector';
import { AvailableDataSourcesService } from '../../services';
import { useKibana } from './use_kibana';
import { queryKeys } from '../query_keys';

/**
 * Transforms a data source type from the registry to our internal Connector type
 */
const transformDataSourceType = (dataSources: DataSource): Connector => {
  return {
    id: dataSources.id,
    name: dataSources.name,
    type: dataSources.stackConnector?.type, // Already has '.' prefix (e.g., '.notion')
    category: 'popular',
  };
};

/**
 * Hook to fetch and manage data sources from the Data Catalog.
 *
 */
export const useDataSources = () => {
  const {
    services: { http, notifications },
  } = useKibana();

  const { data, isLoading, error } = useQuery(
    queryKeys.connectorTypes.list(),
    async () => {
      const service = new AvailableDataSourcesService({ http });
      const connectorTypes = await service.list();

      // Transform connector types to our internal Connector interface
      return connectorTypes.map(transformDataSourceType);
    },
    {
      onError: (err: Error) => {
        notifications?.toasts.addError(err, {
          title: i18n.translate('xpack.dataSources.useDataSources.errorToast', {
            defaultMessage: 'Failed to load available data sources',
          }),
          toastMessage: err.message,
        });
      },
    }
  );

  return {
    connectors: data ?? [],
    isLoading,
    error,
  };
};
