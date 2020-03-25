/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SiemListSchema } from '../routes/schemas/saved_objects/siem_list_schema';

import { SavedObjectsClientContract, SavedObject } from '../../../../../../../../src/core/server';

export const getList = async ({
  listId,
  savedObjectsClient,
}: {
  listId: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObject<SiemListSchema> | null> => {
  const savedObject = await savedObjectsClient.find<SiemListSchema>({
    type: 'siem_list',
    filter: `siem_list.attributes.list_id: ${listId}`,
  });
  if (savedObject.saved_objects.length) {
    return savedObject.saved_objects[0];
  } else {
    return null;
  }
};
