/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public';
import { ESQL_EXTERNAL_DATA_SOURCE_CONNECTOR_ID } from '../../../common/esql_external_data_source_constants';

export type EsqlExternalDataSourceActionParams = Record<string, never>;

export function getConnectorType(): ConnectorTypeModel<
  Record<string, unknown>,
  Record<string, unknown>,
  EsqlExternalDataSourceActionParams
> {
  return {
    id: ESQL_EXTERNAL_DATA_SOURCE_CONNECTOR_ID,
    iconClass: 'discoverApp',
    isExperimental: true,
    hideConnectorIdField: true,
    selectMessage: i18n.translate('xpack.stackConnectors.esqlExternalDataSource.selectMessage', {
      defaultMessage:
        'Connect external storage and warehouse data for use with ES|QL and external data sets.',
    }),
    actionTypeTitle: i18n.translate(
      'xpack.stackConnectors.esqlExternalDataSource.connectorTypeTitle',
      {
        defaultMessage: 'ES|QL external data source',
      }
    ),
    validateParams: async (): Promise<
      GenericValidationResult<EsqlExternalDataSourceActionParams>
    > => {
      return { errors: {} };
    },
    actionConnectorFields: lazy(() => import('./esql_external_data_source_connector')),
    actionParamsFields: lazy(() => import('./esql_external_data_source_params')),
    connectorForm: {
      hideSettingsTitle: true,
    },
  };
}
