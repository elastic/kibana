/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

const DATA_VIEWS_API_HEADERS = { [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31' } as const;
const SAVED_OBJECTS_API_HEADERS = { [ELASTIC_HTTP_VERSION_HEADER]: '2023-10-31' } as const;

export interface KbnRequestable {
  request<T = unknown>(options: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
  }): Promise<{ data: T }>;
}

export async function createDataView(
  kbnClient: KbnRequestable,
  title: string,
  timeFieldName: string,
  space?: string
): Promise<string> {
  const path = space ? `/s/${space}/api/data_views/data_view` : '/api/data_views/data_view';
  const { data } = await kbnClient.request<{ data_view: { id: string } }>({
    method: 'POST',
    path,
    headers: DATA_VIEWS_API_HEADERS,
    body: { data_view: { title, timeFieldName } },
  });
  return data.data_view.id;
}

export async function deleteDataViewByTitle(
  kbnClient: KbnRequestable,
  title: string,
  space?: string
): Promise<void> {
  const listPath = space ? `/s/${space}/api/data_views` : '/api/data_views';
  const { data } = await kbnClient.request<{
    data_view: Array<{ id: string; title: string }>;
  }>({
    method: 'GET',
    path: listPath,
    headers: DATA_VIEWS_API_HEADERS,
  });
  const dataView = data.data_view.find((dv) => dv.title === title);
  if (!dataView) return;
  const deletePath = space
    ? `/s/${space}/api/data_views/data_view/${dataView.id}`
    : `/api/data_views/data_view/${dataView.id}`;
  await kbnClient.request({
    method: 'DELETE',
    path: deletePath,
    headers: DATA_VIEWS_API_HEADERS,
  });
}

export async function deleteSavedObject(
  kbnClient: KbnRequestable,
  type: string,
  id: string
): Promise<void> {
  await kbnClient
    .request({
      method: 'DELETE',
      path: `/api/saved_objects/${type}/${id}`,
      headers: SAVED_OBJECTS_API_HEADERS,
    })
    .catch(() => {});
}

export async function assertSavedObjectExists(
  kbnClient: KbnRequestable,
  type: string,
  id: string
): Promise<void> {
  await kbnClient.request({
    method: 'GET',
    path: `/api/saved_objects/${type}/${id}`,
    headers: SAVED_OBJECTS_API_HEADERS,
  });
}
