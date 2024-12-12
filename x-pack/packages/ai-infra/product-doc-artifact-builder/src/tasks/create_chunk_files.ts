/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const fileSizeLimit = 500_000;

export const createChunkFiles = async ({
  index,
  productName,
  destFolder,
  client,
  log,
}: {
  index: string;
  productName: string;
  destFolder: string;
  client: Client;
  log: ToolingLog;
}) => {
  log.info(`Starting to create chunk files in directory [${destFolder}]`);

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
  let chunkDocCount = 0;
  let chunkContent: string = '';

  const writeCurrentChunk = async () => {
    const chunkFileName = `content-${chunkNumber}.ndjson`;
    log.info(`Writing chunk file ${chunkFileName} containing ${chunkDocCount} docs`);
    await Fs.writeFile(Path.join(destFolder, chunkFileName), chunkContent);
    chunkContent = '';
    chunkDocCount = 0;
    chunkNumber++;
  };

  for (let i = 0; i < searchRes.hits.hits.length; i++) {
    const hit = searchRes.hits.hits[i];
    chunkContent += JSON.stringify(hit._source) + '\n';
    chunkDocCount++;
    if (
      Buffer.byteLength(chunkContent, 'utf8') > fileSizeLimit ||
      i === searchRes.hits.hits.length - 1
    ) {
      await writeCurrentChunk();
    }
  }

  log.info(`Finished creating chunk files`);
};
