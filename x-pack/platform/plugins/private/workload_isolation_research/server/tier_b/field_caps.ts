/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { Readable } from 'stream';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';

export const FIELD_CAPS_PREFIX = 'wir-fc-';

export interface FieldCapsSeedParams {
  readonly indices: number;
  readonly fieldsPerIndex: number;
  /** Fraction of fields whose type differs across indices (type conflicts make shaping heavier). */
  readonly conflictRatio: number;
  /** Fraction of fields unique to each index (drives total distinct fields in the response). */
  readonly uniqueRatio: number;
}

/** Creates many indices with wide, partially conflicting mappings (no customer data). */
export const seedFieldCaps = async (
  es: ElasticsearchClient,
  { indices, fieldsPerIndex, conflictRatio, uniqueRatio }: FieldCapsSeedParams
): Promise<Record<string, number>> => {
  const t0 = performance.now();
  // Wildcard deletes are rejected (action.destructive_requires_name): resolve names first.
  const existing = Object.keys(
    await es.indices.get({
      index: `${FIELD_CAPS_PREFIX}*`,
      ignore_unavailable: true,
      allow_no_indices: true,
    })
  );
  if (existing.length) await es.indices.delete({ index: existing });
  const types = ['keyword', 'long', 'double', 'date', 'boolean', 'ip', 'text'];
  for (let i = 0; i < indices; i++) {
    const properties: Record<string, estypes.MappingProperty> = {};
    for (let f = 0; f < fieldsPerIndex; f++) {
      const conflicting = f < fieldsPerIndex * conflictRatio;
      const type = conflicting ? types[(f + i) % types.length] : types[f % types.length];
      // Nested object paths (a.b.c) like ECS-ish integrations; shared names across indices.
      const unique = f >= fieldsPerIndex * (1 - uniqueRatio);
      const name = unique
        ? `idx_${i}.group_${f % 50}.field_${f}`
        : `group_${f % 50}.sub_${Math.floor(f / 50) % 20}.field_${f}`;
      properties[name] = { type } as estypes.MappingProperty;
    }
    await es.indices.create({
      index: `${FIELD_CAPS_PREFIX}${String(i).padStart(4, '0')}`,
      settings: {
        'index.mapping.total_fields.limit': fieldsPerIndex * 3 + 1000,
        number_of_shards: 1,
      },
      mappings: { properties },
    });
  }
  return { indices, fieldsPerIndex, conflictRatio, uniqueRatio, ms: performance.now() - t0 };
};

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
