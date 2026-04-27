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
 * How many recent cases per owner to inspect when discovering which
 * extended-field keys have been written. The cases SO `extended_fields`
 * field is mapped as `flattened`, and ES `_field_caps` returns only the
 * parent for flattened types — sub-keys are not enumerated. Sampling
 * `_source` is the reliable cross-version path. 200 is enough to cover
 * any realistically active template-field set; raise if a deployment
 * reports missed columns.
 */
const SAMPLE_SIZE = 200;

interface CaseSourceShape {
  cases?: {
    extended_fields?: Record<string, unknown>;
  };
}

/**
 * Discovers the extended-field `(name, type)` pairs for a given owner by
 * sampling recent case SO docs and unioning the keys present in
 * `_source.cases.extended_fields`. The cases SO mapping is `dynamic:false`
 * with `extended_fields` typed `flattened`, so neither `_field_caps` nor
 * the index mapping enumerate sub-paths — `_source` is the only place
 * the keys are observable.
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
    const response = await esClient.search<CaseSourceShape>({
      index: CAI_VIEW_SOURCE_INDEX,
      size: SAMPLE_SIZE,
      _source: [FLATTENED_PARENT_PATH],
      sort: [{ 'cases.updated_at': { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            { term: { type: 'cases' } },
            { term: { 'cases.owner': owner } },
            { exists: { field: FLATTENED_PARENT_PATH } },
          ],
        },
      },
    });

    const seen = new Set<string>();
    const out: TemplateFieldRef[] = [];
    for (const hit of response.hits.hits ?? []) {
      const extended = hit._source?.cases?.extended_fields;
      if (!extended || typeof extended !== 'object') continue;
      for (const subKey of Object.keys(extended)) {
        const parsed = parseExtendedFieldSubkey(`${FLATTENED_PARENT_PATH}.${subKey}`);
        if (!parsed) continue;
        const dedupeKey = `${parsed.name}::${parsed.type}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        out.push(parsed);
      }
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
