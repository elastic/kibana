/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk as toChunks } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import type { BulkRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ExtractedDocument } from './extract_documentation';

const indexingChunkSize = 10;

export const indexDocuments = async ({
  index,
  client,
  documents,
  log,
}: {
  index: string;
  documents: ExtractedDocument[];
  client: Client;
  log: ToolingLog;
}) => {
  const chunks = toChunks(documents, indexingChunkSize);

  log.info(`Starting indexing process`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const before = Date.now();
    await client.bulk(
      {
        refresh: 'wait_for',
        operations: chunk.reduce((operations, document) => {
          operations!.push(...[{ index: { _index: index } }, document]);
          return operations;
        }, [] as BulkRequest['operations']),
      },
      { requestTimeout: 10 * 60 * 1000 }
    );

    const duration = Date.now() - before;
    log.info(`Indexed ${i + 1} of ${chunks.length} chunks (took ${duration}ms)`);
  }

  log.info(`Finished indexing process`);
};
