/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlParam, Filter, Sort } from '../../common/types';
import { InvalidRequestError } from './errors';

const NUMERIC_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
  'counter_long',
  'counter_integer',
  'counter_double',
]);
const STRING_TYPES = new Set(['keyword', 'text']);
// Types whose values must be converted from the string form used in URLs.
const CONVERSIONS: Record<string, string> = {
  date: 'TO_DATETIME',
  date_nanos: 'TO_DATE_NANOS',
  ip: 'TO_IP',
  version: 'TO_VERSION',
};
const UNQUOTED_SOURCE = /^[A-Za-z0-9._*,:+-]+$/;

/** Quotes a field name as an ES|QL identifier. */
export function quoteIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}

/** Renders an index pattern for a FROM command, quoting it when needed. */
export function toSource(index: string): string {
  if (UNQUOTED_SOURCE.test(index)) {
    return index;
  }
  if (index.includes('"')) {
    throw new InvalidRequestError(`Invalid index pattern "${index}"`);
  }
  return `"${index}"`;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\*?]/g, '\\$&');
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** Accumulates named parameters so values never become part of the query text. */
class ParamCollector {
  public readonly params: EsqlParam[] = [];

  public add(value: string, fieldType: string): string {
    const name = `p${this.params.length}`;
    if (NUMERIC_TYPES.has(fieldType)) {
      if (value.trim() === '' || Number.isNaN(Number(value))) {
        throw new InvalidRequestError(`"${value}" is not a valid ${fieldType} value`);
      }
      this.params.push({ name, type: 'number', value: value.trim() });
      return `?${name}`;
    }
    if (fieldType === 'boolean') {
      this.params.push({ name, type: 'boolean', value });
      return `?${name}`;
    }
    this.params.push({ name, type: 'string', value });
    const conversion = CONVERSIONS[fieldType];
    return conversion ? `${conversion}(?${name})` : `?${name}`;
  }
}

function filterToCondition(
  { field, operator, value }: Filter,
  fieldTypes: ReadonlyMap<string, string>,
  params: ParamCollector
): string {
  const type = fieldTypes.get(field) ?? 'keyword';
  const column = quoteIdentifier(field);

  switch (operator) {
    case 'exact':
      return `${column} == ${params.add(value, type)}`;
    case 'not':
      return `(${column} IS NULL OR ${column} != ${params.add(value, type)})`;
    case 'in':
    case 'notin': {
      const values = splitList(value).map((item) => params.add(item, type));
      if (values.length === 0) {
        throw new InvalidRequestError(`"${operator}" on "${field}" needs at least one value`);
      }
      const condition = `${column} IN (${values.join(', ')})`;
      return operator === 'in' ? condition : `(${column} IS NULL OR NOT ${condition})`;
    }
    case 'contains':
    case 'startswith': {
      if (!STRING_TYPES.has(type)) {
        throw new InvalidRequestError(
          `"${operator}" is not supported for ${type} field "${field}"`
        );
      }
      const escaped = escapeLikePattern(value.toLowerCase());
      const pattern = operator === 'contains' ? `*${escaped}*` : `${escaped}*`;
      return `TO_LOWER(${column}) LIKE ${params.add(pattern, 'keyword')}`;
    }
    case 'gt':
      return `${column} > ${params.add(value, type)}`;
    case 'gte':
      return `${column} >= ${params.add(value, type)}`;
    case 'lt':
      return `${column} < ${params.add(value, type)}`;
    case 'lte':
      return `${column} <= ${params.add(value, type)}`;
    case 'exists':
      return `${column} IS NOT NULL`;
    case 'missing':
      return `${column} IS NULL`;
  }
}

export interface FilteredSource {
  /** `FROM` plus `WHERE` commands, one per line, without a trailing newline. */
  readonly base: string;
  readonly params: EsqlParam[];
}

/** Builds the FROM and WHERE part shared by every query of a table view. */
export function buildFilteredSource({
  index,
  filters,
  search,
  fieldTypes,
  metadata = [],
}: {
  index: string;
  filters: readonly Filter[];
  search?: string;
  fieldTypes: ReadonlyMap<string, string>;
  metadata?: readonly string[];
}): FilteredSource {
  const params = new ParamCollector();
  const lines = [
    `FROM ${toSource(index)}${metadata.length > 0 ? ` METADATA ${metadata.join(', ')}` : ''}`,
  ];

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    // Full-text functions must come before other conditions.
    lines.push(`| WHERE QSTR(${params.add(trimmedSearch, 'keyword')})`);
  }
  const conditions = filters.map((filter) => filterToCondition(filter, fieldTypes, params));
  if (conditions.length > 0) {
    lines.push(`| WHERE ${conditions.join(' AND ')}`);
  }

  return { base: lines.join('\n'), params: params.params };
}

/** Renders a SORT command; nulls always sort last. */
export function toSortCommand({ field, direction }: Sort): string {
  return `| SORT ${quoteIdentifier(field)} ${direction.toUpperCase()} NULLS LAST`;
}
