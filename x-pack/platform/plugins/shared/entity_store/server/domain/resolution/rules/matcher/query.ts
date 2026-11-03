/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_ID_FIELD } from '../../../../../common/domain/definitions/common_fields';
import { USER_ENTITY_NAMESPACE } from '../../../../../common/domain/definitions/user_entity_constants';
import { escapeEsqlStringLiteral } from '../../../../../common/esql/strings';
import {
  isExpressionMatchSpec,
  type EsqlFieldMatchSpec,
  type EsqlExpressionMatchSpec,
  type MatcherSpec,
} from '../rule_registry';
import {
  ENGINE_METADATA_TYPE_FIELD,
  ENTITY_NAMESPACE_FIELD,
  ENTITY_TYPE,
  FIRST_SEEN_FIELD,
  GROUP_SIZE_CEILING,
  MATCH_GROUP_COLUMNS,
  MATCHER_PAGE_SIZE,
  RESOLVED_TO_FIELD,
  WATERMARK_COLUMN,
} from './constants';

// Unmapped fields would otherwise abort the whole query. Nullify so a missing
// match field on one namespace does not fail groups that do have it.
const NULLIFY_UNMAPPED_FIELDS_SETTING = 'SET unmapped_fields="nullify";';

export interface BuildMatchGroupsQueryParams {
  index: string;
  spec: MatcherSpec;
  afterMatchValue?: string;
  watermark?: string | null;
  pageSize?: number;
}

export interface BuildWatermarkQueryParams {
  index: string;
  spec: MatcherSpec;
  watermark?: string | null;
}

const quote = (value: string): string => `"${escapeEsqlStringLiteral(value)}"`;

const matchFieldExpression = (spec: EsqlFieldMatchSpec): string => {
  if (spec.fieldByNamespace) {
    const arms = Object.entries(spec.fieldByNamespace).map(
      ([namespace, field]) => `${ENTITY_NAMESPACE_FIELD} == ${quote(namespace)}, ${field}`
    );
    return `CASE(${arms.join(', ')})`;
  }

  return spec.field;
};

const namespaceFilter = (spec: MatcherSpec): string | undefined => {
  if (spec.namespaces.length === 0) {
    return undefined;
  }
  const list = spec.namespaces.map((namespace) => quote(namespace)).join(', ');
  return `${ENTITY_NAMESPACE_FIELD} IN (${list})`;
};

interface QueryParts {
  entityFilters: string[];
  matchValueEval: string;
  matchValueFilters: string[];
  skipFullyResolvedGroups: boolean;
}

const fieldSpecParts = (spec: EsqlFieldMatchSpec): QueryParts => {
  const matchField = matchFieldExpression(spec);
  const entityFilters = [
    `${ENGINE_METADATA_TYPE_FIELD} == ${quote(ENTITY_TYPE)}`,
    // Single-value only: two emails (or two IDs) on one entity is genuinely
    // ambiguous for matching. Email skip is intended. CrowdStrike multi-id is
    // a later, source-specific follow-up — do not MV_EXPAND here.
    `MV_COUNT(${matchField}) == 1`,
  ];
  const namespaces = namespaceFilter(spec);
  if (namespaces) {
    entityFilters.push(namespaces);
  }

  const matchValueFilters = [
    `${MATCH_GROUP_COLUMNS.matchValue} IS NOT NULL`,
    `${MATCH_GROUP_COLUMNS.matchValue} != ""`,
  ];
  if (spec.inclusionPattern) {
    matchValueFilters.push(
      `${MATCH_GROUP_COLUMNS.matchValue} RLIKE ${quote(spec.inclusionPattern)}`
    );
  }
  if (spec.exclusionPattern) {
    matchValueFilters.push(
      `NOT ${MATCH_GROUP_COLUMNS.matchValue} RLIKE ${quote(spec.exclusionPattern)}`
    );
  }

  return {
    entityFilters,
    matchValueEval: spec.lowercase ? `TO_LOWER(${matchField})` : matchField,
    matchValueFilters,
    skipFullyResolvedGroups: false,
  };
};

const expressionSpecParts = (spec: EsqlExpressionMatchSpec): QueryParts => {
  const entityFilters = [`${ENGINE_METADATA_TYPE_FIELD} == ${quote(ENTITY_TYPE)}`];
  const namespaces = namespaceFilter(spec);
  if (namespaces) {
    entityFilters.push(namespaces);
  }
  if (spec.filterExpression) {
    entityFilters.push(`(${spec.filterExpression})`);
  }

  return {
    entityFilters,
    // TO_STRING keeps the page cursor (`match_value > "<last>"`) a string
    // comparison whatever type the customer's key has.
    matchValueEval: `TO_STRING(${spec.matchValueExpression})`,
    // An expression has no single source field, so the single-value check runs on the computed key.
    matchValueFilters: [
      `${MATCH_GROUP_COLUMNS.matchValue} IS NOT NULL`,
      `MV_COUNT(${MATCH_GROUP_COLUMNS.matchValue}) == 1`,
      `${MATCH_GROUP_COLUMNS.matchValue} != ""`,
    ],
    // A group whose members all resolve to one target is already linked;
    // without this a cancelled first scan re-reads it every run.
    skipFullyResolvedGroups: true,
  };
};

const queryPartsFor = (spec: MatcherSpec): QueryParts =>
  isExpressionMatchSpec(spec) ? expressionSpecParts(spec) : fieldSpecParts(spec);

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
  const { entityFilters, matchValueEval, matchValueFilters, skipFullyResolvedGroups } =
    queryPartsFor(spec);
  const parts = [
    NULLIFY_UNMAPPED_FIELDS_SETTING,
    `FROM ${quote(index)}`,
    `| WHERE ${entityFilters.join('\n    AND ')}`,
    `| EVAL ${MATCH_GROUP_COLUMNS.matchValue} = ${matchValueEval}`,
    `| WHERE ${matchValueFilters.join('\n    AND ')}`,
  ];

  if (afterMatchValue !== undefined) {
    parts.push(`| WHERE ${MATCH_GROUP_COLUMNS.matchValue} > ${quote(afterMatchValue)}`);
  }

  parts.push(
    `| EVAL is_unresolved = CASE(${RESOLVED_TO_FIELD} IS NULL, 1, 0)`,
    `| EVAL is_new = CASE(${watermarkFilter(watermark) ?? '1 == 1'}, 1, 0)`,
    // Targets have no resolved_to, so they land in unresolved_id despite the
    // name — that is why out-of-group existing targets can still be cascade-
    // retargeted. Do not rename this to exclude them.
    `| EVAL unresolved_id = CASE(is_unresolved == 1, ${ENTITY_ID_FIELD}, null)`,
    `| EVAL unresolved_namespace = CASE(is_unresolved == 1, ${ENTITY_NAMESPACE_FIELD}, null)`,
    `| EVAL is_unresolved_local = CASE(is_unresolved == 1 AND ${ENTITY_NAMESPACE_FIELD} == ${quote(
      USER_ENTITY_NAMESPACE.Local
    )}, 1, 0)`
  );
  if (skipFullyResolvedGroups) {
    parts.push(`| EVAL effective_target = COALESCE(${RESOLVED_TO_FIELD}, ${ENTITY_ID_FIELD})`);
  }

  // Cap existing_targets with TOP(..., 100), not VALUES(). run.ts skips any
  // group with total_n > 100 before it uses this list, so a truncated target
  // cannot change a link. VALUES() is uncapped and can OOM STATS.
  const existingTargets = `TOP(${RESOLVED_TO_FIELD}, ${GROUP_SIZE_CEILING}, "asc")`;
  const statsColumns = [
    `${MATCH_GROUP_COLUMNS.ids} = TOP(unresolved_id, ${GROUP_SIZE_CEILING}, "asc")`,
    `${MATCH_GROUP_COLUMNS.unresolvedNs} = VALUES(unresolved_namespace)`,
    `${MATCH_GROUP_COLUMNS.existingTargets} = ${existingTargets}`,
    `${MATCH_GROUP_COLUMNS.unresolvedN} = SUM(is_unresolved)`,
    `${MATCH_GROUP_COLUMNS.unresolvedLocalN} = SUM(is_unresolved_local)`,
    `${MATCH_GROUP_COLUMNS.totalN} = COUNT(*)`,
    'new_n = SUM(is_new)',
    // Two targets differ iff MIN != MAX; exact, and cheaper than a distinct count.
    ...(skipFullyResolvedGroups
      ? ['min_target = MIN(effective_target)', 'max_target = MAX(effective_target)']
      : []),
  ];
  const groupFilter = [
    `${MATCH_GROUP_COLUMNS.totalN} >= 2`,
    'new_n >= 1',
    ...(skipFullyResolvedGroups ? ['min_target != max_target'] : []),
  ];

  parts.push(
    `| STATS ${statsColumns.join(',\n        ')}\n    BY ${MATCH_GROUP_COLUMNS.matchValue}`,
    `| WHERE ${groupFilter.join(' AND ')}`,
    `| SORT ${MATCH_GROUP_COLUMNS.matchValue} ASC`,
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
  const { entityFilters, matchValueEval, matchValueFilters } = queryPartsFor(spec);
  const filters = [...entityFilters, `${RESOLVED_TO_FIELD} IS NULL`];
  const newerThan = watermarkFilter(watermark);
  if (newerThan) {
    filters.push(newerThan);
  }

  return [
    NULLIFY_UNMAPPED_FIELDS_SETTING,
    `FROM ${quote(index)}`,
    `| WHERE ${filters.join('\n    AND ')}`,
    `| EVAL ${MATCH_GROUP_COLUMNS.matchValue} = ${matchValueEval}`,
    `| WHERE ${matchValueFilters.join('\n    AND ')}`,
    `| STATS ${WATERMARK_COLUMN} = MAX(${FIRST_SEEN_FIELD})`,
    `| LIMIT 1`,
  ].join('\n');
};

/** The custom rule's key before `TO_STRING`, so validation can see its real type. */
export const RAW_MATCH_VALUE_COLUMN = 'raw_match_value';

/**
 * Runs the rule's filter and key with `LIMIT 0` and without
 * `unmapped_fields="nullify"`, so Elasticsearch rejects an unknown field.
 */
export const buildMatcherValidationQuery = ({
  index,
  spec,
}: {
  index: string;
  spec: EsqlExpressionMatchSpec;
}): string => {
  const { entityFilters, matchValueEval, matchValueFilters } = expressionSpecParts(spec);
  return [
    `FROM ${quote(index)}`,
    `| WHERE ${entityFilters.join('\n    AND ')}`,
    `| EVAL ${RAW_MATCH_VALUE_COLUMN} = (${spec.matchValueExpression})`,
    `| EVAL ${MATCH_GROUP_COLUMNS.matchValue} = ${matchValueEval}`,
    `| WHERE ${matchValueFilters.join('\n    AND ')}`,
    `| KEEP ${MATCH_GROUP_COLUMNS.matchValue}, ${RAW_MATCH_VALUE_COLUMN}`,
    `| LIMIT 0`,
  ].join('\n');
};
