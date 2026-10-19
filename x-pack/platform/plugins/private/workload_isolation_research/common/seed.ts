/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Dataset seeding shared by the plugin seed route and the harness (direct ES on serverless).
import type { Client, estypes } from '@elastic/elasticsearch';
import { performance } from 'perf_hooks';

/** Minimal ES surface used for seeding (satisfied by Kibana's ElasticsearchClient and @elastic/elasticsearch Client). */
export type SeedEsClient = Pick<Client, 'indices' | 'bulk' | 'transport'>;

export const ALERTING_WIDE_INDEX = 'wir-alerting-wide';

export const FIELD_CAPS_PREFIX = 'wir-fc-';

export interface FieldCapsSeedParams {
  readonly indices: number;
  readonly fieldsPerIndex: number;
  /** Fraction of fields whose type differs across indices (type conflicts make shaping heavier). */
  readonly conflictRatio: number;
  /** Fraction of fields unique to each index (drives total distinct fields in the response). */
  readonly uniqueRatio: number;
  /** Serverless rejects explicit shard counts. */
  readonly omitShards?: boolean;
}

/** Creates many indices with wide, partially conflicting mappings (no customer data). */
export const seedFieldCaps = async (
  es: SeedEsClient,
  { indices, fieldsPerIndex, conflictRatio, uniqueRatio, omitShards }: FieldCapsSeedParams
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
        ...(omitShards ? {} : { number_of_shards: 1 }),
      },
      mappings: { properties },
    });
  }
  return { indices, fieldsPerIndex, conflictRatio, uniqueRatio, ms: performance.now() - t0 };
};

export const seedAlertingWide = async (
  es: SeedEsClient,
  rows: number,
  fields: number,
  omitShards = false
) => {
  await es.indices.delete({ index: ALERTING_WIDE_INDEX, ignore_unavailable: true });
  await es.indices.create({
    index: ALERTING_WIDE_INDEX,
    settings: {
      'index.mapping.total_fields.limit': fields + 1000,
      ...(omitShards ? {} : { number_of_shards: 1 }),
    },
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        'host.name': { type: 'keyword' },
        ...Object.fromEntries(
          Array.from({ length: fields }, (_, f) => [`attr_${f}`, { type: 'keyword' }])
        ),
      },
    },
  });
  const now = new Date().toISOString();
  for (let start = 0; start < rows; start += 500) {
    const operations: Array<Record<string, unknown>> = [];
    for (let r = start; r < Math.min(rows, start + 500); r++) {
      const doc: Record<string, unknown> = { '@timestamp': now, 'host.name': `host-${r}` };
      for (let f = 0; f < fields; f++)
        doc[`attr_${f}`] = `value-${r}-${f}-lorem-ipsum-dolor-sit-amet`;
      operations.push({ index: { _index: ALERTING_WIDE_INDEX } }, doc);
    }
    await es.bulk({ operations, refresh: false });
  }
  await es.indices.refresh({ index: ALERTING_WIDE_INDEX });
  return { rows, fields };
};
