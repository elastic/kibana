/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { CUSTOM_APP_STATE_VERSION } from '@kbn/custom-app-common';
import { CUSTOM_APP_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { SavedAppInput } from '../../common/saved_app_schema';

interface StoredApp {
  title: string;
  description?: string;
  version: number;
  document: SavedAppInput['document'];
}

export interface SavedApp extends StoredApp {
  id: string;
  updatedAt?: string;
}

export interface SavedAppListItem {
  id: string;
  title: string;
  description?: string;
  updatedAt?: string;
}

const toStored = ({ title, description, document }: SavedAppInput): StoredApp => ({
  title,
  ...(description === undefined ? {} : { description }),
  version: CUSTOM_APP_STATE_VERSION,
  document,
});

const toSavedApp = (object: {
  id: string;
  attributes: StoredApp;
  updated_at?: string;
}): SavedApp => ({
  id: object.id,
  ...object.attributes,
  ...(object.updated_at ? { updatedAt: object.updated_at } : {}),
});

/** What the routes do, with the saved objects client of the request, which enforces privileges. */
export const createSavedAppsService = (client: SavedObjectsClientContract) => ({
  create: async (input: SavedAppInput): Promise<SavedApp> =>
    toSavedApp(await client.create<StoredApp>(CUSTOM_APP_SAVED_OBJECT_TYPE, toStored(input))),

  get: async (id: string): Promise<SavedApp> =>
    toSavedApp(await client.get<StoredApp>(CUSTOM_APP_SAVED_OBJECT_TYPE, id)),

  update: async (id: string, input: SavedAppInput): Promise<SavedApp> => {
    const stored = toStored(input);
    await client.update<StoredApp>(CUSTOM_APP_SAVED_OBJECT_TYPE, id, stored);
    // Read back, so that the response is what is stored and not what was sent.
    return toSavedApp(await client.get<StoredApp>(CUSTOM_APP_SAVED_OBJECT_TYPE, id));
  },

  remove: async (id: string): Promise<void> => {
    await client.delete(CUSTOM_APP_SAVED_OBJECT_TYPE, id);
  },

  find: async ({
    search,
    page,
    perPage,
  }: {
    search?: string;
    page: number;
    perPage: number;
  }): Promise<{ apps: SavedAppListItem[]; total: number; page: number; perPage: number }> => {
    const result = await client.find<StoredApp>({
      type: CUSTOM_APP_SAVED_OBJECT_TYPE,
      page,
      perPage,
      sortField: 'updated_at',
      sortOrder: 'desc',
      // Only what a list shows: the documents can be large.
      fields: ['title', 'description'],
      ...(search ? { search: `${search}*`, searchFields: ['title'] } : {}),
    });

    return {
      apps: result.saved_objects.map(({ id, attributes, updated_at: updatedAt }) => ({
        id,
        title: attributes.title,
        ...(attributes.description === undefined ? {} : { description: attributes.description }),
        ...(updatedAt ? { updatedAt } : {}),
      })),
      total: result.total,
      page: result.page,
      perPage: result.per_page,
    };
  },
});

export type SavedAppsService = ReturnType<typeof createSavedAppsService>;
