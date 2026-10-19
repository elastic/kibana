/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { Readable } from 'stream';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';

export { FIELD_CAPS_PREFIX, seedFieldCaps } from '../../common/seed';
import { FIELD_CAPS_PREFIX } from '../../common/seed';

const readStream = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
};

export interface FieldCapsRunResult {
  readonly repeat: number;
  readonly bytes: number;
  readonly fields: number;
  readonly io_ms: number;
  readonly decode_ms: number;
  readonly parse_ms: number;
  readonly shape_ms: number;
  readonly e2e_ms: number;
  readonly max_sync_ms: number;
  readonly heap_delta_mb: number;
}

/**
 * Repeated large field_caps through the real data views fetcher, decomposed into
 * network I/O, Buffer→string decode, JSON.parse and data-view shaping (each timed).
 */
export const runFieldCaps = async (
  es: ElasticsearchClient,
  {
    repeat,
    pattern = `${FIELD_CAPS_PREFIX}*`,
    decompose = true,
  }: { repeat: number; pattern?: string; decompose?: boolean }
): Promise<FieldCapsRunResult> => {
  let io = 0;
  let decode = 0;
  let parse = 0;
  let shape = 0;
  let e2e = 0;
  let bytes = 0;
  let fields = 0;
  let maxSync = 0;
  const heap0 = process.memoryUsage().heapUsed;
  for (let r = 0; r < repeat; r++) {
    if (decompose) {
      const t0 = performance.now();
      const res = await es.fieldCaps(
        {
          index: pattern,
          fields: ['*'],
          ignore_unavailable: true,
          include_empty_fields: true,
          expand_wildcards: 'open',
          allow_no_indices: false,
        },
        { asStream: true, meta: true }
      );
      const buf = await readStream(res.body as unknown as Readable);
      const t1 = performance.now();
      const text = buf.toString('utf8');
      const t2 = performance.now();
      const parsed = JSON.parse(text);
      const t3 = performance.now();
      // Shaping only: the real fetcher over a stub client that returns the parsed body.
      const stub = { fieldCaps: async () => ({ body: parsed }) } as unknown as ElasticsearchClient;
      const shaped = await new IndexPatternsFetcher(stub).getFieldsForWildcard({ pattern });
      const t4 = performance.now();
      io += t1 - t0;
      decode += t2 - t1;
      parse += t3 - t2;
      shape += t4 - t3;
      bytes += buf.length;
      fields = shaped.fields.length;
      maxSync = Math.max(maxSync, t3 - t1, t4 - t3);
    } else {
      const t0 = performance.now();
      const shaped = await new IndexPatternsFetcher(es).getFieldsForWildcard({ pattern });
      e2e += performance.now() - t0;
      fields = shaped.fields.length;
    }
  }
  return {
    repeat,
    bytes,
    fields,
    io_ms: io,
    decode_ms: decode,
    parse_ms: parse,
    shape_ms: shape,
    e2e_ms: e2e,
    max_sync_ms: maxSync,
    heap_delta_mb: (process.memoryUsage().heapUsed - heap0) / 1048576,
  };
};
