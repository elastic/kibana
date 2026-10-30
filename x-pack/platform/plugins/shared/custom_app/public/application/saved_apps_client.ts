/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { AppDocument } from '@kbn/custom-app-common';
import { SAVED_APPS_API_PATH, SAVED_APPS_API_VERSION } from '../../common/constants';

export interface SavedApp {
  id: string;
  title: string;
  description?: string;
  version: number;
  /** As stored: the page checks it with the schema before it shows it. */
  document: unknown;
  updatedAt?: string;
}

export interface SavedAppListItem {
  id: string;
  title: string;
  description?: string;
  updatedAt?: string;
}

export interface SavedAppList {
  apps: SavedAppListItem[];
  total: number;
  page: number;
  perPage: number;
}

export interface SavedAppInput {
  title: string;
  description?: string;
  document: AppDocument;
}

const options = { version: SAVED_APPS_API_VERSION } as const;

const path = (id: string) => `${SAVED_APPS_API_PATH}/${encodeURIComponent(id)}`;

/** The saved apps API, for the standalone application. */
export const createSavedAppsClient = (http: HttpStart) => ({
  find: ({ search, page, perPage }: { search?: string; page: number; perPage: number }) =>
    http.get<SavedAppList>(SAVED_APPS_API_PATH, {
      ...options,
      query: { page, perPage, ...(search ? { search } : {}) },
    }),
  get: (id: string) => http.get<SavedApp>(path(id), options),
  create: (input: SavedAppInput) =>
    http.post<SavedApp>(SAVED_APPS_API_PATH, { ...options, body: JSON.stringify(input) }),
  update: (id: string, input: SavedAppInput) =>
    http.put<SavedApp>(path(id), { ...options, body: JSON.stringify(input) }),
  remove: (id: string) => http.delete<{ id: string }>(path(id), options),
});

export type SavedAppsClient = ReturnType<typeof createSavedAppsClient>;
