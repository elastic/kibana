/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '../../../../../../../../src/core/server';
import { SiemListItemSchema } from '../routes/schemas/saved_objects/siem_list_item_schema';

export const findListItems = async ({
  listId,
  perPage,
  page,
  sortField,
  sortOrder,
  savedObjectsClient,
}: {
  listId: string;
  perPage?: number;
  page?: number;
  sortField?: string;
  sortOrder?: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObjectsFindResponse<SiemListItemSchema>> => {
  // TODO: Do we want to limit the fields using the fields option?
  return savedObjectsClient.find<SiemListItemSchema>({
    type: 'siem_list_item',
    filter: `siem_list_item.attributes.list_id: ${listId}`,
    perPage,
    page,
    sortField,
    sortOrder,
  });
};
