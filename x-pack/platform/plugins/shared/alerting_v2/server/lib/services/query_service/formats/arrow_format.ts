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

interface ArrowRecordBatch {
  readonly schema: { fields: ReadonlyArray<{ name: string; typeId: number }> };
  toArray(): Array<{ toJSON(): EsqlRow }>;
}

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

export const arrowFormat = {
  name: 'arrow' as const,
  async open(
    esClient: ElasticsearchClient,
    request: EsqlFormatRequest,
    options: EsqlFormatRequestOptions
  ): Promise<EsqlRowBatchSource> {
    const reader = await esClient.helpers.esql(request, options).toArrowReader();

    if (!reader) {
      throw new Error('toArrowReader returned undefined');
    }

    return { batches: decodeBatches(reader), close: () => closeReader(reader) };
  },
} satisfies EsqlResponseFormat;
