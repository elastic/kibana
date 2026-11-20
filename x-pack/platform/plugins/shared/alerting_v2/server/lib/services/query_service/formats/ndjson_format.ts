/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Readable } from 'stream';
import { StringDecoder } from 'string_decoder';
import { errors, type TransportResult } from '@elastic/elasticsearch';
import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsqlRow } from '../row_coercion';
import { toRows } from '../row_coercion';
import type {
  EsqlFormatRequest,
  EsqlFormatRequestOptions,
  EsqlResponseFormat,
  EsqlRowBatchSource,
} from './types';

export const NDJSON_BATCH_SIZE = 100;

type StreamResult = TransportResult<Readable, unknown>;

interface NdjsonHeaderLine {
  columns: EsqlQueryResponse['columns'];
  all_columns?: EsqlQueryResponse['columns'];
}

type NdjsonRowLine = EsqlQueryResponse['values'][number];

interface NdjsonFooterLine {
  status: number;
  is_partial: boolean;
  warnings: string[];
  complete: boolean;
  next_offset: number;
  error?: { type: string; reason: string };
}

type NdjsonLine = NdjsonHeaderLine | NdjsonRowLine | NdjsonFooterLine;

async function* readLines(body: AsyncIterable<Buffer | string>): AsyncIterable<string> {
  const decoder = new StringDecoder('utf8');
  let pending = '';

  for await (const chunk of body) {
    pending += typeof chunk === 'string' ? chunk : decoder.write(chunk);
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';

    for (const line of lines) {
      if (line.trim()) {
        yield line;
      }
    }
  }

  pending += decoder.end();
  if (pending.trim()) {
    yield pending;
  }
}

const readBody = async (body: AsyncIterable<Buffer | string>): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const text = Buffer.concat(chunks).toString();

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * Errors raised after the header arrive with HTTP 200, so the footer status is
 * the only source of truth; it is surfaced as a `ResponseError` carrying that
 * status so it is classified exactly like a non-streaming ES|QL failure.
 */
const throwIfFooterFailed = (result: StreamResult, footer: NdjsonFooterLine): void => {
  if (footer.error === undefined && footer.status < 400) {
    return;
  }

  throw new errors.ResponseError({ ...result, statusCode: footer.status, body: footer });
};

async function* decodeLines(result: StreamResult): AsyncIterable<EsqlRow[]> {
  let columns: EsqlQueryResponse['columns'] | undefined;
  let values: EsqlQueryResponse['values'] = [];

  for await (const rawLine of readLines(result.body)) {
    const line = JSON.parse(rawLine) as NdjsonLine;

    if (Array.isArray(line)) {
      if (!columns) {
        throw new Error('NDJSON row arrived before the columns header');
      }
      values.push(line);
      if (values.length === NDJSON_BATCH_SIZE) {
        yield toRows({ columns, values }, { normalizeDates: true });
        values = [];
      }
    } else if ('status' in line) {
      throwIfFooterFailed(result, line);
      if (columns && values.length > 0) {
        yield toRows({ columns, values }, { normalizeDates: true });
      }
      return;
    } else if ('columns' in line) {
      columns = line.columns;
    }
  }

  throw new Error('NDJSON stream ended without a footer');
}

const destroyBody = async (body: Readable): Promise<void> => {
  if (body.destroyed) {
    return;
  }

  body.destroy();
};

export const ndjsonFormat = {
  name: 'ndjson' as const,
  async open(
    esClient: ElasticsearchClient,
    request: EsqlFormatRequest,
    options: EsqlFormatRequestOptions
  ): Promise<EsqlRowBatchSource> {
    const { drop_null_columns: dropNullColumns, ...body } = request;

    const result = await esClient.transport.request<Readable>(
      {
        method: 'POST',
        path: '/_query/stream',
        querystring: dropNullColumns === undefined ? {} : { drop_null_columns: dropNullColumns },
        body,
      },
      { ...options, asStream: true, meta: true, headers: { accept: 'application/x-ndjson' } }
    );

    if (result.statusCode >= 400) {
      throw new errors.ResponseError({ ...result, body: await readBody(result.body) });
    }

    return { batches: decodeLines(result), close: () => destroyBody(result.body) };
  },
} satisfies EsqlResponseFormat;
