/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkResponse,
} from '../../../../../../../../src/core/server';
import { SiemListItemSchema } from '../routes/schemas/saved_objects/siem_list_item_schema';

export const createListItemsBulk = async ({
  listId,
  ips,
  savedObjectsClient,
}: {
  listId: string;
  ips: string[] | undefined;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObjectsBulkResponse<SiemListItemSchema> | null> => {
  if (ips == null) {
    return null;
  }
  const bulk: Array<SavedObjectsBulkCreateObject<SiemListItemSchema>> = ips.map(ip => ({
    type: 'siem_list_item',
    attributes: {
      list_id: listId,
      ip,
      created_at: new Date().toISOString(),
    },
  }));
  return savedObjectsClient.bulkCreate<SiemListItemSchema>(bulk);
};
