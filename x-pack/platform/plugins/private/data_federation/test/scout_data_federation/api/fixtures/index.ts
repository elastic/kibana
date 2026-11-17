/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

const DATA_SOURCE_BY_ID_ROUTE_PATH = '/internal/data_federation/data_sources/{id}' as const;
const DATA_SET_BY_ID_ROUTE_PATH = '/internal/data_federation/dataset/{id}' as const;

export const getDataSourceByIdApiPath = (id: string): string =>
  DATA_SOURCE_BY_ID_ROUTE_PATH.replace('{id}', encodeURIComponent(id));

export const getDataSetByIdApiPath = (id: string): string =>
  DATA_SET_BY_ID_ROUTE_PATH.replace('{id}', encodeURIComponent(id));

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
} as const;

export const CUSTOM_ROLES: Record<string, KibanaRole> = {
  // The data source routes delegate authorization to Elasticsearch, which requires `manage`.
  data_source_manager: {
    elasticsearch: { cluster: ['manage'] },
    kibana: [],
  },
  data_set_manager: {
    elasticsearch: {
      cluster: ['manage'],
      indices: [{ names: ['*'], privileges: ['manage'] }],
    },
    kibana: [],
  },
};
