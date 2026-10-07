/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { KbnClient } from '@kbn/kbn-client';

const SAVED_OBJECTS_API_HEADERS = { [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31' } as const;

export async function deleteSavedObject(
  kbnClient: KbnClient,
  type: string,
  id: string
): Promise<void> {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/saved_objects/${type}/${id}`,
    headers: SAVED_OBJECTS_API_HEADERS,
    ignoreErrors: [404],
  });
}

export async function assertSavedObjectExists(
  kbnClient: KbnClient,
  type: string,
  id: string
): Promise<void> {
  await kbnClient.request({
    method: 'GET',
    path: `/api/saved_objects/${type}/${id}`,
    headers: SAVED_OBJECTS_API_HEADERS,
  });
}
