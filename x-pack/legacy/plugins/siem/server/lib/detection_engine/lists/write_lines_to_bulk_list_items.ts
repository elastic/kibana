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

// TODO: Should we have a flag to list duplicates

interface LinesResult {
  linesProcessed: number;
  duplicatesFound: number;
}

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
}): Promise<LinesResult> => {
  return new Promise<LinesResult>((resolve, reject) => {
    const bufferSize = 100;
    const buffer = new Set<string>();
    let linesProcessed = 0;
    let duplicatesFound = 0;

    const readline = readLine.createInterface({
      input: stream,
    });

    readline.on('line', async line => {
      buffer.add(line);
      if (buffer.size === bufferSize) {
        const arrayFromBuffer = Array.from(buffer);
        // TODO: Do we want to check for the existence first and reject those?
        const items = await getListItemsByValues({
          listId,
          clusterClient,
          listsItemsIndex,
          ips: arrayFromBuffer,
        });
        const duplicatesRemoved = arrayFromBuffer.filter(ip => !items.some(item => item.ip === ip));
        linesProcessed += duplicatesRemoved.length;
        duplicatesFound += arrayFromBuffer.length - duplicatesRemoved.length;
        createListItemsBulk({ listId, ips: duplicatesRemoved, clusterClient, listsItemsIndex });
        buffer.clear();
      }
    });

    readline.on('close', async () => {
      const arrayFromBuffer = Array.from(buffer);
      // TODO: Do we want to check for the existence first and reject those?
      const items = await getListItemsByValues({
        listId,
        clusterClient,
        listsItemsIndex,
        ips: arrayFromBuffer,
      });
      const duplicatesRemoved = arrayFromBuffer.filter(ip => !items.some(item => item.ip === ip));
      linesProcessed += duplicatesRemoved.length;
      duplicatesFound += arrayFromBuffer.length - duplicatesRemoved.length;
      createListItemsBulk({ listId, ips: arrayFromBuffer, clusterClient, listsItemsIndex });
      buffer.clear();
      resolve({ linesProcessed, duplicatesFound });
    });
  });
};
