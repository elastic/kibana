/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { Owner } from '../../../common/constants/types';
import { CAI_VIEW_SOURCE_INDEX } from './constants';
import type { TemplateFieldRef } from './extended_fields_to_eval';

/**
 * Mirror of the FieldType `type` literals in
 * `common/types/domain/template/fields.ts`. Subkeys whose suffix is not
 * one of these are skipped (e.g. malformed manual writes, unknown future
 * types) — keeps unknown fields out of the view rather than emitting a
 * cast we can't honor.
 */
const VALID_TYPES = new Set([
  'keyword',
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'date',
]);

const FLATTENED_PARENT_PATH = 'cases.extended_fields';
const SUFFIX_SEPARATOR = '_as_';

/**
 * Parses a flattened sub-key path like `cases.extended_fields.riskScore_as_long`
 * into `{ name: 'riskScore', type: 'long' }`. Returns null for paths that
 * don't match the convention or whose type isn't recognized.
 */
export const parseExtendedFieldSubkey = (fullPath: string): TemplateFieldRef | null => {
  const prefix = `${FLATTENED_PARENT_PATH}.`;
  if (!fullPath.startsWith(prefix)) return null;
  const subKey = fullPath.slice(prefix.length);
  // lastIndexOf so a name containing "_as_" doesn't get truncated early.
  const sep = subKey.lastIndexOf(SUFFIX_SEPARATOR);
  if (sep <= 0) return null;
  const name = subKey.slice(0, sep);
  const type = subKey.slice(sep + SUFFIX_SEPARATOR.length);
  if (!name || !VALID_TYPES.has(type)) return null;
  return { name, type };
};

/**
 * Maximum distinct extended-field keys we expect to discover per owner.
 * Matches ES default `search.max_buckets` for terms aggs. Raise if a
 * deployment legitimately exceeds this many template fields.
 */
const MAX_DISTINCT_KEYS = 10_000;

const RUNTIME_FIELD_NAME = '_cai_extended_field_keys';

/**
 * Painless source: emits one keyword per key present in
 * `_source.cases.extended_fields` per doc. Used as a runtime field that
 * we then aggregate on with a `terms` agg, giving us exact-distinct
 * coverage of every key written for the owner — no sampling gap.
 */
const RUNTIME_KEY_EMITTER = `
  if (params._source != null
      && params._source.cases != null
      && params._source.cases.extended_fields != null
      && params._source.cases.extended_fields instanceof Map) {
    for (def key : ((Map) params._source.cases.extended_fields).keySet()) {
      emit(key);
    }
  }
`;

interface KeysAggregation {
  buckets: Array<{ key: string; doc_count: number }>;
}

/**
 * Discovers the extended-field `(name, type)` pairs for a given owner by
 * unioning every distinct key written under `_source.cases.extended_fields`
 * for that owner's case docs. The cases SO mapping is `dynamic:false`
 * with `extended_fields` typed `flattened`, so neither `_field_caps` nor
 * the index mapping enumerate sub-paths — `_source` is the only place
 * the keys are observable.
 *
 * The discovery uses a runtime field that emits one keyword per key per
 * doc, plus a terms aggregation on it. This is deterministic across the
 * entire document population (not a recent-N sample) at the cost of a
 * single Painless evaluation per doc at agg time. The query runs at
 * plugin start and from the manual rebuild route — never on a hot
 * user-facing path.
 *
 * Reactive (a key shows up only after the first case uses it) but
 * resilient: deleted templates don't strand stale columns, and
 * historical fields stay queryable as long as the data is indexed.
 */
export const loadExtendedFieldsFromMapping = async (
  owner: Owner,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<TemplateFieldRef[]> => {
  try {
    const response = await esClient.search({
      index: CAI_VIEW_SOURCE_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { type: 'cases' } },
            { term: { 'cases.owner': owner } },
            { exists: { field: FLATTENED_PARENT_PATH } },
          ],
        },
      },
      runtime_mappings: {
        [RUNTIME_FIELD_NAME]: {
          type: 'keyword',
          script: { lang: 'painless', source: RUNTIME_KEY_EMITTER },
        },
      },
      aggregations: {
        keys: {
          terms: { field: RUNTIME_FIELD_NAME, size: MAX_DISTINCT_KEYS },
        },
      },
    });

    const aggregation = response.aggregations?.keys as KeysAggregation | undefined;
    const buckets = aggregation?.buckets ?? [];
    const seen = new Set<string>();
    const out: TemplateFieldRef[] = [];
    for (const bucket of buckets) {
      const parsed = parseExtendedFieldSubkey(`${FLATTENED_PARENT_PATH}.${bucket.key}`);
      if (!parsed) continue;
      const dedupeKey = `${parsed.name}::${parsed.type}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push(parsed);
    }
    return out;
  } catch (err) {
    logger.warn(
      `Failed to discover extended-field subkeys for owner=${owner}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
};
