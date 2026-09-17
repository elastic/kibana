/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInterface } from 'readline';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ZipArchive } from './zip_archive';

// Content files can be tens of MBs of precomputed embeddings; bounding each bulk
// request keeps the heap from growing to several copies of the whole file.
export const DEFAULT_MAX_BULK_BYTES = 4 * 1024 * 1024;
export const DEFAULT_MAX_BULK_DOCS = 250;

type Document = Record<string, any>;
type BulkOperations = Array<BulkOperationContainer | Document>;

/**
 * Streams an ndjson entry from the archive into the index, one bounded bulk request at a time,
 * so that only a single batch of documents is held in memory at any point.
 */
export const indexNdjsonEntry = async ({
  archive,
  entryPath,
  indexName,
  esClient,
  transformDocument,
  maxBulkBytes = DEFAULT_MAX_BULK_BYTES,
  maxBulkDocs = DEFAULT_MAX_BULK_DOCS,
}: {
  archive: ZipArchive;
  entryPath: string;
  indexName: string;
  esClient: ElasticsearchClient;
  transformDocument: (document: Document) => Document;
  maxBulkBytes?: number;
  maxBulkDocs?: number;
}): Promise<void> => {
  const stream = await archive.getEntryStream(entryPath);
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  let operations: BulkOperations = [];
  let batchBytes = 0;
  let batchDocs = 0;

  const flush = async () => {
    if (batchDocs === 0) {
      return;
    }
    const batch = operations;
    operations = [];
    batchBytes = 0;
    batchDocs = 0;
    await bulkIndex({ esClient, operations: batch });
  };

  try {
    for await (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.length === 0) {
        continue;
      }
      operations.push({ index: { _index: indexName } }, transformDocument(JSON.parse(line)));
      batchBytes += line.length;
      batchDocs += 1;
      if (batchBytes >= maxBulkBytes || batchDocs >= maxBulkDocs) {
        await flush();
      }
    }
    await flush();
  } finally {
    lines.close();
    stream.destroy();
  }
};

const bulkIndex = async ({
  esClient,
  operations,
}: {
  esClient: ElasticsearchClient;
  operations: BulkOperations;
}) => {
  const response = await esClient.bulk({
    refresh: false,
    operations,
  });

  if (response.errors) {
    const error = response.items.find((item) => item.index?.error)?.index?.error ?? 'unknown error';
    throw new Error(`Error indexing documents: ${JSON.stringify(error)}`);
  }
};

export const rewriteInferenceId = ({
  document,
  inferenceId,
  legacySemanticText,
}: {
  document: Document;
  inferenceId: string;
  legacySemanticText: boolean;
}): Document => {
  const semanticFieldsRoot = legacySemanticText ? document : document._inference_fields;
  // we don't need to handle nested fields, we don't have any and won't.
  Object.values(semanticFieldsRoot ?? {}).forEach((field: any) => {
    if (field.inference) {
      field.inference.inference_id = inferenceId;
    }
  });
  return document;
};
