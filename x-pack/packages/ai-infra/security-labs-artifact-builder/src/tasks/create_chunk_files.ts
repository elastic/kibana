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

/**
 * Creates chunk files from indexed documents for packaging into the artifact.
 * Merges _inference_fields from the fields response into _source to preserve
 * pre-computed embeddings for semantic_text fields.
 */
export const createChunkFiles = async ({
  index,
  destFolder,
  client,
  log,
}: {
  index: string;
  destFolder: string;
  client: Client;
  log: ToolingLog;
}) => {
  log.info(`Starting to create chunk files in directory [${destFolder}]`);

  const searchRes = await client.search({
    index,
    size: 10000,
    // Request _inference_fields to get pre-computed embeddings
    fields: ['_inference_fields'],
    query: {
      match_all: {},
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

    // Merge _inference_fields from fields response into the document
    // This preserves pre-computed embeddings for semantic_text fields
    const doc: Record<string, unknown> = { ...(hit._source as Record<string, unknown>) };
    if (hit.fields && hit.fields._inference_fields) {
      // _inference_fields comes as an array with a single object
      const inferenceFields = Array.isArray(hit.fields._inference_fields)
        ? hit.fields._inference_fields[0]
        : hit.fields._inference_fields;
      doc._inference_fields = inferenceFields;
    }

    chunkContent += JSON.stringify(doc) + '\n';
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
