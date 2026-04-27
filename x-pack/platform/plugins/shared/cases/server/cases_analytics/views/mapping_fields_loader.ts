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
 * Discovers the extended-field `(name, type)` pairs for a given owner by
 * asking ES which flattened sub-keys have been indexed under
 * `.kibana_alerting_cases` for that owner's case docs.
 *
 * Replaces the templates-driven discovery: instead of parsing every
 * cases-templates SO's YAML and computing a union, we ask the
 * authoritative source — what's actually been written — via
 * `_field_caps`. Reactive (a field shows up only after the first case
 * uses it) but resilient: deleted templates don't strand stale columns,
 * and historical fields stay queryable.
 *
 * `_field_caps` accepts an `index_filter` body that scopes discovery to
 * docs matching the predicate. We filter to `type=cases` AND
 * `cases.owner=<owner>` so each per-owner view only carries its own
 * solution's columns.
 */
export const loadExtendedFieldsFromMapping = async (
  owner: Owner,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<TemplateFieldRef[]> => {
  try {
    const response = await esClient.fieldCaps({
      index: CAI_VIEW_SOURCE_INDEX,
      fields: `${FLATTENED_PARENT_PATH}.*`,
      include_unmapped: false,
      index_filter: {
        bool: {
          filter: [
            { term: { type: 'cases' } },
            { term: { 'cases.owner': owner } },
          ],
        },
      },
    });

    const fields = response.fields ?? {};
    const seen = new Set<string>();
    const out: TemplateFieldRef[] = [];
    for (const fullPath of Object.keys(fields)) {
      const parsed = parseExtendedFieldSubkey(fullPath);
      if (!parsed) continue;
      const dedupeKey = `${parsed.name}::${parsed.type}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push(parsed);
    }
    return out;
  } catch (err) {
    logger.warn(
      `Failed to load extended-field subkeys via _field_caps for owner=${owner}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return [];
  }
};
