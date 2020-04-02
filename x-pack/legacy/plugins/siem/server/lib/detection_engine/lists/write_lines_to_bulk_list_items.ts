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

// TODO: Should we have a flag to list duplicates to the user?

interface LinesResult {
  linesProcessed: number;
  duplicatesFound: number;
}

const BUFFER_SIZE = 100;

// TODO: Combine this with the readline below and pull this into its own file
class BufferLines extends Readable {
  private set = new Set<string>();
  constructor() {
    super({ encoding: 'utf-8' });
  }
  public _read() {
    // No operation required to be implemented
  }

  public push(chunk: string | null, encoding?: string): boolean {
    if (chunk == null) {
      const bufferJSON = JSON.stringify(Array.from(this.set));
      super.push(bufferJSON, encoding);
      const returnCode = super.push(null);
      this.set.clear();
      return returnCode;
    } else {
      this.set.add(chunk);
      if (this.set.size > BUFFER_SIZE) {
        const bufferJSON = JSON.stringify(Array.from(this.set));
        const returnCode = super.push(bufferJSON, encoding);
        this.set.clear();
        return returnCode;
      } else {
        return true;
      }
    }
  }
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
    let linesProcessed = 0;
    let duplicatesFound = 0;

    const readline = readLine.createInterface({
      input: stream,
    });

    const readBuffer = new BufferLines();

    readBuffer.on('data', async (lines: string) => {
      const linesParsed: string[] = JSON.parse(lines);

      const linesStatus = await writeBufferToItems({
        listId,
        clusterClient,
        buffer: linesParsed,
        listsItemsIndex,
      });

      linesProcessed += linesStatus.linesProcessed;
      duplicatesFound += linesStatus.duplicatesFound;
    });

    readBuffer.on('end', () => {
      resolve({ linesProcessed, duplicatesFound });
    });

    readline.on('line', line => {
      readBuffer.push(line);
    });

    readline.on('close', () => {
      readBuffer.push(null);
    });
  });
};

export const writeBufferToItems = async ({
  listId,
  clusterClient,
  listsItemsIndex,
  buffer,
}: {
  listId: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
  listsItemsIndex: string;
  buffer: string[];
}): Promise<LinesResult> => {
  const items = await getListItemsByValues({
    listId,
    clusterClient,
    listsItemsIndex,
    ips: buffer,
  });
  const duplicatesRemoved = buffer.filter(ip => !items.some(item => item.ip === ip));
  const linesProcessed = duplicatesRemoved.length;
  const duplicatesFound = buffer.length - duplicatesRemoved.length;
  await createListItemsBulk({ listId, ips: duplicatesRemoved, clusterClient, listsItemsIndex });
  return { linesProcessed, duplicatesFound };
};
