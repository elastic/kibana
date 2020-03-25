/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pickBy } from 'lodash/fp';
import {
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '../../../../../../../../src/core/server';
import { SiemListSchema } from '../routes/schemas/saved_objects/siem_list_schema';
import { getListByListId } from './get_list_by_list_id';

export const buildListWithoutNil = (
  list: Omit<SiemListSchema, 'list_id' | 'created_at'>
): Partial<SiemListSchema> => {
  return pickBy<SiemListSchema>((value: unknown) => value != null, list);
};

export const updateListByListId = async ({
  listId,
  name,
  description,
  savedObjectsClient,
}: {
  listId: string;
  name: string | undefined;
  description: string | undefined;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObjectsUpdateResponse<SiemListSchema> | null> => {
  const list = await getListByListId({ listId, savedObjectsClient });
  if (list == null) {
    return null;
  } else {
    const partial = buildListWithoutNil({
      name,
      description,
      // TODO: Add the updated_at
      // updated_at: new Date().toISOString(),
    });
    return savedObjectsClient.update<SiemListSchema>('siem_list', list.id, partial);
  }
};
