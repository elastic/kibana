/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { AlertingConnectorFeatureId } from '@kbn/actions-plugin/common';
import type {
  ClassicActionType,
  ActionTypeExecutorOptions,
  ActionTypeExecutorResult,
} from '@kbn/actions-plugin/server/types';
import { ESQL_EXTERNAL_DATA_SOURCE_CONNECTOR_ID } from '../../../common/esql_external_data_source_constants';

type EsqlExternalDataSourceConfig = Record<string, unknown>;
type EsqlExternalDataSourceSecrets = Record<string, unknown>;
type EsqlExternalDataSourceParams = Record<string, unknown>;

export function getConnectorType(): ClassicActionType<
  EsqlExternalDataSourceConfig,
  EsqlExternalDataSourceSecrets,
  EsqlExternalDataSourceParams
> {
  return {
    id: ESQL_EXTERNAL_DATA_SOURCE_CONNECTOR_ID,
    name: i18n.translate('xpack.stackConnectors.esqlExternalDataSource.name', {
      defaultMessage: 'ES|QL external data source',
    }),
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: [AlertingConnectorFeatureId],
    validate: {
      config: { schema: schema.recordOf(schema.string(), schema.any()) },
      secrets: { schema: schema.recordOf(schema.string(), schema.any()) },
      params: { schema: schema.object({}) },
    },
    executor,
  };
}

async function executor(
  execOptions: ActionTypeExecutorOptions<
    EsqlExternalDataSourceConfig,
    EsqlExternalDataSourceSecrets,
    EsqlExternalDataSourceParams
  >
): Promise<ActionTypeExecutorResult<void>> {
  return { status: 'ok', actionId: execOptions.actionId };
}
