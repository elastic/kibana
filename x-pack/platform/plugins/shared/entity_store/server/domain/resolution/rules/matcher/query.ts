/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeEsqlStringLiteral } from '../../../../../common/esql/strings';
import type { EsqlMatchSpec } from '../rule_registry';
import {
  ENGINE_METADATA_TYPE_FIELD,
  ENTITY_NAMESPACE_FIELD,
  ENTITY_TYPE,
  FIRST_SEEN_FIELD,
  GROUP_SIZE_CEILING,
  MATCHER_PAGE_SIZE,
  RESOLVED_TO_FIELD,
} from './constants';

const NULLIFY_UNMAPPED_FIELDS_SETTING = 'SET unmapped_fields="nullify";';

export interface BuildMatchGroupsQueryParams {
  index: string;
  spec: EsqlMatchSpec;
  afterMatchValue?: string;
  watermark?: string | null;
  pageSize?: number;
}

export interface BuildWatermarkQueryParams {
  index: string;
  spec: EsqlMatchSpec;
  watermark?: string | null;
}

const quote = (value: string): string => `"${escapeEsqlStringLiteral(value)}"`;

const matchFieldExpression = (spec: EsqlMatchSpec): string => {
  if (spec.field) {
    return spec.field;
  }

  const fieldByNamespace = spec.fieldByNamespace;
  if (!fieldByNamespace) {
    throw new Error('EsqlMatchSpec requires field or fieldByNamespace');
  }

  const arms = Object.entries(fieldByNamespace).map(
    ([namespace, field]) => `entity.namespace == ${quote(namespace)}, ${field}`
  );
  return `CASE(${arms.join(', ')})`;
};

const namespaceFilter = (spec: EsqlMatchSpec): string | undefined => {
  if (spec.namespaces.length === 0) {
    return undefined;
  }
  const list = spec.namespaces.map((namespace) => quote(namespace)).join(', ');
  return `${ENTITY_NAMESPACE_FIELD} IN (${list})`;
};

const sharedFilters = (spec: EsqlMatchSpec): string[] => {
  const matchField = matchFieldExpression(spec);
  const filters = [
    `${ENGINE_METADATA_TYPE_FIELD} == ${quote(ENTITY_TYPE)}`,
    `MV_COUNT(${matchField}) == 1`,
  ];
  const namespaces = namespaceFilter(spec);
  if (namespaces) {
    filters.push(namespaces);
  }
  return filters;
};

const matchValueExpression = (spec: EsqlMatchSpec): string => {
  const matchField = matchFieldExpression(spec);
  return spec.lowercase ? `TO_LOWER(${matchField})` : matchField;
};

const matchValueGates = (spec: EsqlMatchSpec): string[] => {
  const gates = ['match_value IS NOT NULL', 'match_value != ""'];
  if (spec.inclusionPattern) {
    gates.push(`match_value RLIKE ${quote(spec.inclusionPattern)}`);
  }
  if (spec.exclusionPattern) {
    gates.push(`NOT match_value RLIKE ${quote(spec.exclusionPattern)}`);
  }
  return gates;
};

const watermarkFilter = (watermark?: string | null): string | undefined => {
  if (!watermark) {
    return undefined;
  }
  return `${FIRST_SEEN_FIELD} > TO_DATETIME(${quote(watermark)})`;
};

/**
 * Groups entities that share a (possibly lowercased) match value. Keyset-paginated
 * on `match_value`. When `watermark` is set, only groups with at least one member
 * newer than the watermark are returned — pairing those new members with older
 * unresolved entities in the same group.
 */
export const buildMatchGroupsQuery = ({
  index,
  spec,
  afterMatchValue,
  watermark,
  pageSize = MATCHER_PAGE_SIZE,
}: BuildMatchGroupsQueryParams): string => {
  const parts = [
    NULLIFY_UNMAPPED_FIELDS_SETTING,
    `FROM ${quote(index)}`,
    `| WHERE ${sharedFilters(spec).join('\n    AND ')}`,
    `| EVAL match_value = ${matchValueExpression(spec)}`,
    `| WHERE ${matchValueGates(spec).join('\n    AND ')}`,
  ];

  if (afterMatchValue !== undefined) {
    parts.push(`| WHERE match_value > ${quote(afterMatchValue)}`);
  }

  parts.push(
    `| EVAL is_unresolved = CASE(${RESOLVED_TO_FIELD} IS NULL, 1, 0)`,
    `| EVAL is_new = CASE(${watermark ? watermarkFilter(watermark) : '1 == 1'}, 1, 0)`,
    `| EVAL unresolved_id = CASE(is_unresolved == 1, entity.id, null)`,
    `| EVAL unresolved_namespace = CASE(is_unresolved == 1, ${ENTITY_NAMESPACE_FIELD}, null)`,
    `| STATS ids = TOP(unresolved_id, ${GROUP_SIZE_CEILING}, "asc"),
        unresolved_ns = VALUES(unresolved_namespace),
        existing_targets = VALUES(${RESOLVED_TO_FIELD}),
        unresolved_n = SUM(is_unresolved),
        n = COUNT(*),
        new_n = SUM(is_new)
    BY match_value`,
    `| WHERE n >= 2 AND new_n >= 1`,
    `| SORT match_value ASC`,
    `| LIMIT ${pageSize}`
  );

  return parts.join('\n');
};

/**
 * Max `first_seen` among unresolved entities this rule would consider. Used as
 * the next watermark; omitted groups (n < 2) still advance it so unique values
 * are not re-scanned.
 */
export const buildWatermarkQuery = ({
  index,
  spec,
  watermark,
}: BuildWatermarkQueryParams): string => {
  const filters = [...sharedFilters(spec), `${RESOLVED_TO_FIELD} IS NULL`];
  const newerThan = watermarkFilter(watermark);
  if (newerThan) {
    filters.push(newerThan);
  }

  return [
    NULLIFY_UNMAPPED_FIELDS_SETTING,
    `FROM ${quote(index)}`,
    `| WHERE ${filters.join('\n    AND ')}`,
    `| EVAL match_value = ${matchValueExpression(spec)}`,
    `| WHERE ${matchValueGates(spec).join('\n    AND ')}`,
    `| STATS max_ts = MAX(${FIRST_SEEN_FIELD})`,
    `| LIMIT 1`,
  ].join('\n');
};
