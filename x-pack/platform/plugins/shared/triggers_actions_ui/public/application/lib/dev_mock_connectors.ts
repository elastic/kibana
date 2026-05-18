/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType } from '@kbn/actions-plugin/common';
import { i18n } from '@kbn/i18n';

import type { ActionConnector } from '../../types';

/**
 * Prototype connector type id for external data source catalog entries.
 * Same string as `ESQL_EXTERNAL_DATA_SOURCE_CONNECTOR_ID` in
 * `stack_connectors/common/esql_external_data_source_constants.ts`.
 */
export const ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID = '.esql-external-data-source';

/** Compatibility column labels for {@link ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID} connectors. */
export function getEsqlExternalDataSourceCompatibilityLabels(): string[] {
  return [
    i18n.translate('xpack.triggersActionsUI.prototype.esqlExternalDataSourceCompatibility', {
      defaultMessage: 'ES|QL external data sets',
    }),
  ];
}

/**
 * Ensures the connectors list can resolve a display name for {@link ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID}
 * before the type exists in the Actions API response.
 */
export function getPrototypeEsqlExternalDataSourceActionType(): ActionType {
  return {
    id: ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID,
    name: i18n.translate(
      'xpack.triggersActionsUI.prototype.esqlExternalDataSourceConnectorTypeName',
      {
        defaultMessage: 'ES|QL external data source',
      }
    ),
    enabled: true,
    enabledInConfig: true,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: [],
    isSystemActionType: false,
    isDeprecated: false,
  };
}

/**
 * Mirror of `INITIAL_ROWS` in
 * `data_source_management/common/sample_data_sources_client.ts` — each row is a connector instance
 * of type {@link ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID} (subset / catalog entry for that type).
 *
 * Used when the connectors API returns an empty list so the table renders instead of the empty state.
 * Remove or gate before shipping.
 */
export function getDevMockConnectors(): ActionConnector[] {
  const rows: Array<{
    id: string;
    name: string;
    description: string;
    dataSourceType: string;
  }> = [
    {
      id: 'ds-logs-prod',
      name: 'logs-production',
      description: 'Read-only connection used by Observability for production log indices.',
      dataSourceType: 's3',
    },
    {
      id: 'ds-security',
      name: 'security-analytics',
      description: 'Cross-cluster search target for detection rules and alert history.',
      dataSourceType: 'iceberg',
    },
    {
      id: 'ds-reports',
      name: 'reporting-archive',
      description: 'Historical CSV and PDF reports stored in a cold-tier cluster.',
      dataSourceType: 'gcs',
    },
    {
      id: 'ds-stage',
      name: 'staging-metrics',
      description: 'Low-volume metrics cluster for pre-production dashboards and experiments.',
      dataSourceType: 'jdbc',
    },
    {
      id: 'ds-fleet',
      name: 'fleet-ingest',
      description: 'Elasticsearch endpoint receiving Elastic Agent documents and fleet metadata.',
      dataSourceType: 'flight',
    },
  ];

  return rows.map((row) => ({
    id: row.id,
    actionTypeId: ESQL_EXTERNAL_DATA_SOURCE_ACTION_TYPE_ID,
    name: row.name,
    config: {
      description: row.description,
      dataSourceType: row.dataSourceType,
    },
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
  }));
}
