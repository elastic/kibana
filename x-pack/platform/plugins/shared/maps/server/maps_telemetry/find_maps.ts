/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import { MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import type { StoredMapAttributes } from '..';

export async function findMaps(
  savedObjectsClient: Pick<ISavedObjectsRepository, 'find'>,
  callback: (savedObject: SavedObject<StoredMapAttributes>) => void
) {
  let nextPage = 1;
  let hasMorePages = false;
  do {
    const results = await savedObjectsClient.find<StoredMapAttributes>({
      type: MAP_SAVED_OBJECT_TYPE,
      page: nextPage,
    });
    results.saved_objects.forEach((savedObject) => callback(savedObject));
    nextPage++;
    hasMorePages = results.page * results.per_page <= results.total;
  } while (hasMorePages);
}
