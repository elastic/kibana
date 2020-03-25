/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SiemListSchema } from '../routes/schemas/saved_objects/siem_list_schema';

import { SavedObjectsClientContract, SavedObject } from '../../../../../../../../src/core/server';

export const getFilterClause = (
  elements: Array<{ name: string; value: string | undefined }>
): string => {
  return elements
    .map(({ name, value }) => `siem_list_item.attributes.${name}: ${value}`)
    .join(' AND ');
};

export const getListItemByListId = async ({
  listId,
  savedObjectsClient,
  ip,
}: {
  listId: string;
  savedObjectsClient: SavedObjectsClientContract;
  ip: string | undefined;
}): Promise<SavedObject<SiemListSchema> | null> => {
  const filterClause = getFilterClause([{ name: 'ip', value: ip }]);
  const savedObject = await savedObjectsClient.find<SiemListSchema>({
    type: 'siem_list_item',
    filter: `siem_list_item.attributes.list_id: ${listId} AND ${filterClause}`,
  });
  if (savedObject.saved_objects.length) {
    return savedObject.saved_objects[0];
  } else {
    return null;
  }
};
