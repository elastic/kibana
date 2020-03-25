/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObject } from '../../../../../../../../src/core/server';
import { SiemListItemSchema } from '../routes/schemas/saved_objects/siem_list_item_schema';

export const createListItem = async ({
  listId,
  ip,
  savedObjectsClient,
}: {
  listId: string;
  ip: string | undefined;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObject<SiemListItemSchema>> => {
  // TODO: Do something with the undefined ip above?
  return savedObjectsClient.create<SiemListItemSchema>('siem_list_item', {
    ip,
    list_id: listId,
    created_at: new Date().toISOString(),
  });
};
