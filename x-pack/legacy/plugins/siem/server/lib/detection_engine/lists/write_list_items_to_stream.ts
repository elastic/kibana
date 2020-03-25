/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PassThrough } from 'stream';
import { findListItemsByListId } from './find_list_items_by_list_id';
import { SavedObjectsClientContract } from '../../../../../../../../src/core/server';

export const PER_PAGE = 10;

export const writeListItemsToStream = ({
  listId,
  savedObjectsClient,
  stream,
}: {
  listId: string;
  savedObjectsClient: SavedObjectsClientContract;
  stream: PassThrough;
}): void => {
  // Use a timeout to start the reading process on the next tick
  // and prevent the async await from bubbling up to the caller
  setTimeout(async () => {
    let page = 0;
    let moreData = true;
    while (moreData) {
      page++;
      const items = await findListItemsByListId({
        page,
        listId,
        savedObjectsClient,
        sortField: 'ip',
        perPage: PER_PAGE,
      });
      if (items.saved_objects.length) {
        const values = items.saved_objects
          .map(item => item.attributes.ip)
          .filter(value => value != null)
          .join('\n');
        stream.push(values);
        stream.push('\n');
      } else {
        moreData = false;
      }
    }
    stream.end();
  });
};
