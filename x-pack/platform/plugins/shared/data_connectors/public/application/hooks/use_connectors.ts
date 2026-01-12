/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/common';
import type { Connector } from '../../types/connector';
import { DataConnectorTypesService } from '../../services';
import { useKibana } from './use_kibana';

/**
 * Transforms a data source type from the registry to our internal Connector type
 */
const transformDataSourceType = (dataTypeDefinition: DataTypeDefinition): Connector => {
  return {
    id: dataTypeDefinition.id,
    name: dataTypeDefinition.name,
    type: dataTypeDefinition.stackConnector?.type, // Already has '.' prefix (e.g., '.notion')
    category: 'popular',
  };
};

/**
 * Hook to fetch and manage connectors from the Data Sources Registry.
 *
 */
export const useConnectors = () => {
  const {
    services: { http, notifications },
  } = useKibana();

  const { data, isLoading, error } = useQuery(
    ['connectorTypes', 'list'],
    async () => {
      const service = new DataConnectorTypesService({ http });
      const connectorTypes = await service.list();

      // Transform connector types to our internal Connector interface
      return connectorTypes.map(transformDataSourceType);
    },
    {
      onError: (err: Error) => {
        notifications?.toasts.addError(err, {
          title: i18n.translate('xpack.dataConnectors.useConnectors.errorToast', {
            defaultMessage: 'Failed to load connector types',
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
