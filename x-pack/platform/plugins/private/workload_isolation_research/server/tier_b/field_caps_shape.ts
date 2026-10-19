/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { ElasticsearchClient } from '@kbn/core/server';
import { IndexPatternsFetcher } from '@kbn/data-views-plugin/server';
import type { FieldCapsShapeResult } from '../lib/isolated_task_protocol';

/** Decodes and shapes real field-caps bytes locally; only scalar summaries cross back. */
export const shapeFieldCapsBytes = async (
  bytes: ArrayBuffer,
  pattern: string
): Promise<FieldCapsShapeResult> => {
  const heap0 = process.memoryUsage().heapUsed;
  const t0 = performance.now();
  const text = Buffer.from(bytes).toString('utf8');
  const t1 = performance.now();
  const parsed = JSON.parse(text);
  const t2 = performance.now();
  const stub = { fieldCaps: async () => ({ body: parsed }) } as ElasticsearchClient;
  const shaped = await new IndexPatternsFetcher(stub).getFieldsForWildcard({ pattern });
  const t3 = performance.now();
  return {
    fields: shaped.fields.length,
    field_digest: createHash('sha256').update(JSON.stringify(shaped.fields)).digest('hex'),
    decode_ms: t1 - t0,
    parse_ms: t2 - t1,
    shape_ms: t3 - t2,
    heap_delta_mb: (process.memoryUsage().heapUsed - heap0) / 1048576,
  };
};
