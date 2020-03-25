/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import readLine from 'readline';

import { Readable } from 'stream';
import { SavedObjectsClientContract } from '../../../../../../../../src/core/server';
import { createListItemsBulk } from '../lists/create_list_items_bulk';

// TODO: Implement overwrite and overwrite values if the flag is set through a readBulk and writeBulk
export const writeLinesToBulkListItems = ({
  listId,
  stream,
  savedObjectsClient,
}: {
  listId: string;
  stream: Readable;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    const bufferSize = 100;
    let buffer: string[] = [];
    let linesProcessed = 0;
    const readline = readLine.createInterface({
      input: stream,
    });
    readline.on('line', line => {
      linesProcessed++;
      buffer = [...buffer, line];
      if (buffer.length === bufferSize) {
        createListItemsBulk({ listId, ips: buffer, savedObjectsClient });
        buffer = [];
      }
    });
    readline.on('close', () => {
      resolve(linesProcessed);
    });
  });
};
