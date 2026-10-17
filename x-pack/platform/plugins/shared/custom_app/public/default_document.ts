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
| WHERE CONTAINS(service, ?nameFilter) AND errors >= TO_INTEGER(?minErrors)
| KEEP service, errors
| SORT errors DESC`;

export const SERVICE_DETAIL_QUERY = `${SERVICES}
| WHERE service == ?service
| EVAL owner = CONCAT(service, "-team")
| KEEP service, errors, owner`;

/** A new app: nothing in it yet, so that it is shown an empty state and not an example. */
export const createEmptyDocument = (): AppDocument => ({
  state: {},
  root: { type: 'stack', id: 'root', direction: 'vertical', children: [] },
});

/** An example to start from, which works on any cluster. */
export const createDefaultDocument = (): AppDocument => ({
  state: {
    service: { type: 'string', default: '' },
    nameFilter: { type: 'string', default: '' },
    minErrors: { type: 'string', default: '0' },
  },
  root: {
    type: 'stack',
    id: 'root',
    direction: 'vertical',
    children: [
      {
        type: 'heading',
        id: 'title',
        text: i18n.translate('xpack.customApp.defaultDocument.title', {
          defaultMessage: 'Your custom app',
        }),
      },
      {
        type: 'text',
        id: 'intro',
        text: i18n.translate('xpack.customApp.defaultDocument.intro', {
          defaultMessage:
            'Filter the services, then select one to see its details. Editing is coming soon.',
        }),
      },
      {
        type: 'stack',
        id: 'filters',
        direction: 'horizontal',
        children: [
          {
            type: 'search',
            id: 'name-filter',
            label: i18n.translate('xpack.customApp.defaultDocument.nameFilterLabel', {
              defaultMessage: 'Service name',
            }),
            placeholder: i18n.translate('xpack.customApp.defaultDocument.nameFilterPlaceholder', {
              defaultMessage: 'Search services',
            }),
            bind: 'nameFilter',
            onChange: [],
          },
          {
            type: 'select',
            id: 'min-errors',
            label: i18n.translate('xpack.customApp.defaultDocument.minErrorsLabel', {
              defaultMessage: 'Errors',
            }),
            bind: 'minErrors',
            options: [
              {
                value: '0',
                label: i18n.translate('xpack.customApp.defaultDocument.minErrorsAny', {
                  defaultMessage: 'Any',
                }),
              },
              {
                value: '10',
                label: i18n.translate('xpack.customApp.defaultDocument.minErrors10', {
                  defaultMessage: '10 or more',
                }),
              },
              {
                value: '20',
                label: i18n.translate('xpack.customApp.defaultDocument.minErrors20', {
                  defaultMessage: '20 or more',
                }),
              },
            ],
            onChange: [],
          },
        ],
      },
      {
        type: 'table',
        id: 'services-table',
        query: SERVICES_QUERY,
        caption: i18n.translate('xpack.customApp.defaultDocument.tableCaption', {
          defaultMessage: 'Services and their error counts',
        }),
        columns: [
          { field: 'service', label: 'Service' },
          { field: 'errors', label: 'Errors' },
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
        children: [{ type: 'key_value', id: 'service-detail', query: SERVICE_DETAIL_QUERY }],
      },
    ],
  },
});
