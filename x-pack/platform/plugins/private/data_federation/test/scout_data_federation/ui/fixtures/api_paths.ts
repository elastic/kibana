/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const INTERNAL_API_BASE_PATH = '/internal/data_federation' as const;

const DATA_SOURCE_BY_ID_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/data_sources/{id}` as const;
const DATA_SET_BY_ID_ROUTE_PATH = `${INTERNAL_API_BASE_PATH}/dataset/{id}` as const;

export function getDataSourceByIdApiPath(id: string): string {
  return DATA_SOURCE_BY_ID_ROUTE_PATH.replace('{id}', encodeURIComponent(id));
}

export function getDataSetByIdApiPath(id: string): string {
  return DATA_SET_BY_ID_ROUTE_PATH.replace('{id}', encodeURIComponent(id));
}
