/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type { DataSource, DataSourceType, DataSourceWithSecrets } from './datasource_types';
export { ALL_DATA_SOURCE_TYPES } from './datasource_types';

export const PLUGIN_ID = 'data_source_management';

/** Base path for this plugin's HTTP APIs (internal). */
export const INTERNAL_API_BASE_PATH = '/internal/data_source_management' as const;

/** GET — list data sources (proxies to Elasticsearch `GET /_query/datasource`). */
export const DATA_SOURCES_LIST_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/data_sources` as const;

/**
 * By-id data source routes (Kibana path; `{id}` is a path parameter).
 * - GET → Elasticsearch `GET /_query/datasource/{id}`
 * - PUT → Elasticsearch `PUT /_query/datasource/{id}` (create data source)
 * - DELETE → Elasticsearch `DELETE /_query/datasource/{id}`
 */
export const DATA_SOURCE_BY_ID_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/data_sources/{id}` as const;

export const PLUGIN_NAME = i18n.translate('dataSourceManagement.pluginName', {
  defaultMessage: 'ES|QL Data federation',
});

export const LIST_BREADCRUMB = [
  {
    text: PLUGIN_NAME,
    href: '#/management/data/data_source_management',
  },
];
