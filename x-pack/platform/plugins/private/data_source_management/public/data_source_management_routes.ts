/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DATA_SOURCE_MANAGEMENT_ROUTES = {
  list: '/',
  connect: '/connect',
  /** React Router path pattern (includes `:sourceId`). */
  sourceDetail: '/source/:sourceId',
} as const;

export function getDataSourceDetailPath(sourceId: string): string {
  return `/source/${encodeURIComponent(sourceId)}`;
}
