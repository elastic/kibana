/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AppDocument } from '@kbn/custom-app-common';

// Temporary demo data that needs no index, so a new panel works on any cluster. Replaced by
// templates once the start flow exists.
const SERVICES = `ROW data = ["checkout:12", "cart:3", "search:27", "payments:5"]
| MV_EXPAND data
| DISSECT data "%{service}:%{errors}"
| EVAL errors = TO_INTEGER(errors)`;

export const SERVICES_QUERY = `${SERVICES}
| KEEP service, errors
| SORT errors DESC`;

export const SERVICE_DETAIL_QUERY = `${SERVICES}
| WHERE service == ?service
| EVAL owner = CONCAT(service, "-team")
| KEEP service, errors, owner`;

/** The starter content of a newly added panel. */
export const createDefaultDocument = (): AppDocument => ({
  state: { service: { type: 'string', default: '' } },
  dataSources: {
    services: { type: 'esql', query: SERVICES_QUERY },
    serviceDetail: { type: 'esql', query: SERVICE_DETAIL_QUERY },
  },
  root: {
    type: 'stack',
    id: 'root',
    direction: 'vertical',
    gap: 'm',
    children: [
      {
        type: 'heading',
        id: 'title',
        size: 'm',
        text: i18n.translate('xpack.customApp.defaultDocument.title', {
          defaultMessage: 'Your custom app',
        }),
      },
      {
        type: 'text',
        id: 'intro',
        text: i18n.translate('xpack.customApp.defaultDocument.intro', {
          defaultMessage: 'Select a service to see its details. Editing is coming soon.',
        }),
      },
      {
        type: 'table',
        id: 'services-table',
        source: 'services',
        caption: i18n.translate('xpack.customApp.defaultDocument.tableCaption', {
          defaultMessage: 'Services and their error counts',
        }),
        columns: [
          { field: 'service', label: 'Service', format: 'text' },
          { field: 'errors', label: 'Errors', format: 'number' },
        ],
        onRowClick: [
          { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
          { type: 'openFlyout', flyout: 'service-flyout' },
        ],
      },
      {
        type: 'flyout',
        id: 'service-flyout',
        title: i18n.translate('xpack.customApp.defaultDocument.flyoutTitle', {
          defaultMessage: 'Service {service}',
          // The reference is data, not translatable text; i18n would read the braces as a
          // placeholder.
          values: { service: '{{state.service}}' },
        }),
        size: 'm',
        children: [{ type: 'key_value', id: 'service-detail', source: 'serviceDetail' }],
      },
    ],
  },
});
