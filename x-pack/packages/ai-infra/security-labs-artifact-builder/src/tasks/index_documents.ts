/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk as toChunks } from 'lodash';
import type { Client } from '@elastic/elasticsearch';
import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import type { IndexedSecurityLabsDocument } from '../types';

const indexingChunkSize = 10;

/**
 * Summarizes bulk item failures without dumping the full response (which can be
 * large/noisy and may include request payloads).
 */
export const summarizeBulkErrors = (response: BulkResponse): string => {
  const failures = response.items
    .map((item) => {
      const operation = item.index ?? item.create ?? item.update ?? item.delete;
      if (!operation?.error) {
        return undefined;
      }
      return {
        status: operation.status,
        _index: operation._index,
        _id: operation._id,
        error: {
          type: operation.error.type,
          reason: operation.error.reason,
          caused_by: operation.error.caused_by
            ? {
                type: operation.error.caused_by.type,
                reason: operation.error.caused_by.reason,
              }
            : undefined,
        },
      };
    })
    .filter((failure): failure is NonNullable<typeof failure> => failure != null);

  return JSON.stringify({ failureCount: failures.length, failures });
};

/**
 * Indexes Security Labs documents into Elasticsearch.
 * This generates ELSER embeddings for semantic_text fields.
 */
export const indexDocuments = async ({
  index,
  client,
  documents,
  log,
}: {
  index: string;
  documents: IndexedSecurityLabsDocument[];
  client: Client;
  log: ToolingLog;
}) => {
  const chunks = toChunks(documents, indexingChunkSize);

  log.info(`Starting indexing process for ${documents.length} documents`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const before = Date.now();

    const response = await client.bulk(
      {
        refresh: 'wait_for',
        operations: chunk.reduce((operations, document) => {
          // IMPORTANT:
          // Avoid indexing empty strings for `semantic_text` fields.
          // If the field exists (even as ""), Elasticsearch may attempt inference bookkeeping
          // and conflict with precomputed `_inference_fields`, causing duplicate field errors.
          const cleaned: Record<string, unknown> = { ...document };
          if (typeof cleaned.description === 'string' && cleaned.description.trim() === '') {
            delete cleaned.description;
          }
          if (typeof cleaned.content === 'string' && cleaned.content.trim() === '') {
            delete cleaned.content;
          }

          operations!.push(...[{ index: { _index: index } }, cleaned]);
          return operations;
        }, [] as BulkRequest['operations']),
      },
      { requestTimeout: 10 * 60 * 1000 }
    );

    if (response.errors) {
      throw new Error(
        `Bulk indexing failed for chunk ${i + 1} of ${chunks.length}: ${summarizeBulkErrors(
          response
        )}`
      );
    }

    const duration = Date.now() - before;
    log.info(`Indexed ${i + 1} of ${chunks.length} chunks (took ${duration}ms)`);
  }

  log.info(`Finished indexing process`);
};
