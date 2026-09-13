/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Type, type AsyncRecordBatchStreamReader } from 'apache-arrow/Arrow.node';
import type { EsqlRow } from '../row_coercion';
import { coerceRow } from '../row_coercion';
import type {
  EsqlFormatRequest,
  EsqlFormatRequestOptions,
  EsqlResponseFormat,
  EsqlRowBatchSource,
} from './types';

/**
 * The subset of an Arrow `RecordBatch` the decoder reads. Narrowing it here keeps
 * {@link decodeArrowBatch} unit-testable without building real Arrow buffers.
 */
interface ArrowRecordBatch {
  readonly schema: { fields: ReadonlyArray<{ name: string; typeId: number }> };
  toArray(): Array<{ toJSON(): EsqlRow }>;
}

/** Decodes one Arrow record batch into plain rows, normalizing timestamps to epoch millis. */
export const decodeArrowBatch = (batch: ArrowRecordBatch): EsqlRow[] => {
  const dateColumns = new Set(
    batch.schema.fields
      .filter((field) => field.typeId === Type.Timestamp)
      .map((field) => field.name)
  );

  return batch.toArray().map((row) => coerceRow(row.toJSON(), dateColumns));
};

async function* decodeBatches(reader: AsyncRecordBatchStreamReader): AsyncIterable<EsqlRow[]> {
  for await (const batch of reader) {
    yield decodeArrowBatch(batch);
  }
}

const closeReader = async (reader: AsyncRecordBatchStreamReader): Promise<void> => {
  if (reader.closed) {
    return;
  }

  await reader.cancel();
};

/**
 * Streams self-contained Arrow record batches, so memory stays bounded by the
 * batch size rather than the result set.
 */
export const arrowFormat = {
  name: 'arrow' as const,
  async open(
    esClient: ElasticsearchClient,
    request: EsqlFormatRequest,
    options: EsqlFormatRequestOptions
  ): Promise<EsqlRowBatchSource> {
    // Arrow streaming uses chunked transfer encoding so the transport's
    // maxResponseSize guard (which checks Content-Length) will not fire.
    // The per-run alerts.max row limit acts as the primary guardrail here.
    const reader = await esClient.helpers.esql(request, options).toArrowReader();

    if (!reader) {
      throw new Error('toArrowReader returned undefined');
    }

    return { batches: decodeBatches(reader), close: () => closeReader(reader) };
  },
} satisfies EsqlResponseFormat;
