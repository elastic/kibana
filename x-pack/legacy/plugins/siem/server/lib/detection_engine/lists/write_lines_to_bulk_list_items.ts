/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import readLine from 'readline';

import { Readable } from 'stream';
import { createListItemsBulk } from '../lists/create_list_items_bulk';
import { ScopedClusterClient } from '../../../../../../../../src/core/server';
import { getListItemsByValues } from './get_list_items_by_values';

// TODO: Implement overwrite and overwrite values if the flag is set through a readBulk and writeBulk
export const writeLinesToBulkListItems = ({
  listId,
  stream,
  clusterClient,
  listsItemsIndex,
}: {
  listId: string;
  stream: Readable;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
}): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    const bufferSize = 100;
    const buffer = new Set<string>();
    let linesProcessed = 0;

    const readline = readLine.createInterface({
      input: stream,
    });

    readline.on('line', async line => {
      linesProcessed++;
      buffer.add(line);
      if (buffer.size === bufferSize) {
        const arrayFromBuffer = Array.from(buffer);
        // TODO: Do we want to check for the existence first and reject those?
        getListItemsByValues({
          listId,
          clusterClient,
          listsItemsIndex,
          ips: arrayFromBuffer,
        });
        createListItemsBulk({ listId, ips: arrayFromBuffer, clusterClient, listsItemsIndex });
        buffer.clear();
      }
    });

    readline.on('close', async () => {
      const arrayFromBuffer = Array.from(buffer);
      // TODO: Do we want to check for the existence first and reject those?
      createListItemsBulk({ listId, ips: arrayFromBuffer, clusterClient, listsItemsIndex });
      buffer.clear();
      resolve(linesProcessed);
    });
  });
};
