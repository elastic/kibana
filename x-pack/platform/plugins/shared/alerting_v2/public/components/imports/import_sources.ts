/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ActionType } from '@kbn/actions-types';

export type ImportSourceKind = 'custom' | 'connector' | 'comingSoon';

/** One card of the source picker. */
export interface ImportSource {
  id: string;
  kind: ImportSourceKind;
  title: string;
  description: string;
  /** The connector type to draw the logo from, for example `.datadog`. */
  iconConnectorTypeId?: string;
  /** Set for `connector` sources. */
  connectorType?: ActionType;
  /** Why a source cannot be picked. Only set for sources that are disabled. */
  disabledReason?: string;
  isTechnicalPreview?: boolean;
}

export const CUSTOM_WEBHOOK_SOURCE_ID = 'customWebhook';

/**
 * Vendors we pretend to support so the catalog looks like it will. They are never clickable.
 * POC: nothing behind these, they need an `importAlerts` connector and a workflow first.
 */
const COMING_SOON_VENDORS: Array<{ id: string; name: string; iconConnectorTypeId: string }> = [
  { id: 'zabbix', name: 'Zabbix', iconConnectorTypeId: '.zabbix' },
  { id: 'dynatrace', name: 'Dynatrace', iconConnectorTypeId: '.dynatrace' },
  { id: 'grafana', name: 'Grafana', iconConnectorTypeId: '.grafana' },
  { id: 'newRelic', name: 'New Relic', iconConnectorTypeId: '.new_relic' },
  { id: 'prometheus', name: 'Prometheus Alertmanager', iconConnectorTypeId: '.prometheus' },
  { id: 'awsCloudwatch', name: 'AWS CloudWatch', iconConnectorTypeId: '.aws_cloudwatch' },
  { id: 'sentry', name: 'Sentry', iconConnectorTypeId: '.sentry' },
  { id: 'azureMonitor', name: 'Azure Monitor', iconConnectorTypeId: '.azure_monitor' },
];

/** The search field appears once the catalog is long enough to need it. */
export const IMPORT_SOURCE_SEARCH_THRESHOLD = 8;

const getConnectorSourceDescription = (connectorType: ActionType): string =>
  connectorType.description ??
  i18n.translate('xpack.alertingV2.imports.picker.connectorDescription', {
    defaultMessage: 'Import alerts with your {name} connector.',
    values: { name: connectorType.name },
  });

export const buildImportSources = (connectorTypes: ActionType[]): ImportSource[] => [
  {
    id: CUSTOM_WEBHOOK_SOURCE_ID,
    kind: 'custom',
    title: i18n.translate('xpack.alertingV2.imports.picker.custom.title', {
      defaultMessage: 'Custom webhook',
    }),
    description: i18n.translate('xpack.alertingV2.imports.picker.custom.description', {
      defaultMessage:
        'Send alerts from any system. We create the webhook and a workflow that turns each payload into an alert.',
    }),
  },
  ...connectorTypes.map(
    (connectorType): ImportSource => ({
      id: connectorType.id,
      kind: 'connector',
      title: connectorType.name,
      description: getConnectorSourceDescription(connectorType),
      iconConnectorTypeId: connectorType.id,
      connectorType,
      isTechnicalPreview: connectorType.isExperimental === true,
      ...(connectorType.enabledInLicense
        ? {}
        : {
            disabledReason: i18n.translate('xpack.alertingV2.imports.picker.licenseRequired', {
              defaultMessage: 'Requires a {license} license.',
              values: { license: connectorType.minimumLicenseRequired },
            }),
          }),
    })
  ),
  ...COMING_SOON_VENDORS.map(
    ({ id, name, iconConnectorTypeId }): ImportSource => ({
      id,
      kind: 'comingSoon',
      title: name,
      description: i18n.translate('xpack.alertingV2.imports.picker.comingSoon.description', {
        defaultMessage: 'Import alerts from {name}.',
        values: { name },
      }),
      iconConnectorTypeId,
      disabledReason: i18n.translate('xpack.alertingV2.imports.picker.comingSoon.reason', {
        defaultMessage: 'Not available yet.',
      }),
    })
  ),
];

export const filterImportSources = (sources: ImportSource[], search: string): ImportSource[] => {
  const needle = search.trim().toLowerCase();
  if (needle === '') {
    return sources;
  }
  return sources.filter(
    ({ title, description }) =>
      title.toLowerCase().includes(needle) || description.toLowerCase().includes(needle)
  );
};

/** A body the vendor sends, for the example request. Types without an entry use the generic one. */
const MANAGED_EXAMPLE_PAYLOADS: Record<string, Record<string, unknown>> = {
  '.datadog': {
    title: 'High CPU on web-01',
    message: 'CPU above 90% for 5 minutes',
    monitor_id: '1234567',
    scopes: ['host:web-01'],
    alert_transition: 'Triggered',
    severity: 'P2',
  },
};

export const getManagedExamplePayload = (
  connectorTypeId: string
): Record<string, unknown> | undefined => MANAGED_EXAMPLE_PAYLOADS[connectorTypeId];
