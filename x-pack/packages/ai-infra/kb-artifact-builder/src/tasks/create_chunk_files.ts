/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import type { Client } from '@elastic/elasticsearch';

const fileSizeLimit = 250_000;

export const createChunkFiles = async ({
  index,
  productName,
  destFolder,
  client,
}: {
  index: string;
  productName: string;
  destFolder: string;
  client: Client;
}) => {
  const searchRes = await client.search({
    index,
    size: 10000,
    query: {
      bool: {
        must: [{ term: { product_name: productName } }],
      },
    },
  });

  await Fs.mkdir(destFolder, { recursive: true });

  let chunkNumber = 1;
  let chunkContent: string = '';

  const writeCurrentChunk = async () => {
    await Fs.writeFile(Path.join(destFolder, `content-${chunkNumber}.ndjson`), chunkContent);
    chunkContent = '';
    chunkNumber++;
  };

  for (let i = 0; i < searchRes.hits.hits.length; i++) {
    const hit = searchRes.hits.hits[i];
    chunkContent += JSON.stringify(hit._source) + '\n';
    if (
      Buffer.byteLength(chunkContent, 'utf8') > fileSizeLimit ||
      i === searchRes.hits.hits.length - 1
    ) {
      await writeCurrentChunk();
    }
  }
};
