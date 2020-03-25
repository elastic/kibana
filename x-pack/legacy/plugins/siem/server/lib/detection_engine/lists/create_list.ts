/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObject } from '../../../../../../../../src/core/server';
import { SiemListSchema } from '../routes/schemas/saved_objects/siem_list_schema';

export const createList = async ({
  listId,
  name,
  description,
  savedObjectsClient,
}: {
  listId: string;
  name: string | undefined;
  description: string | undefined;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObject<SiemListSchema>> => {
  return savedObjectsClient.create<SiemListSchema>('siem_list', {
    name,
    description,
    list_id: listId,
    created_at: new Date().toISOString(),
  });
};
