/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';

/**
 * Vega treats an unescaped dot in a field name as nested-object access:
 * `"field": "geo.src"` is read as `datum.geo.src`. ES|QL result columns are flat
 * (a column is literally named `geo.src`), so an unescaped reference throws
 * "Cannot read properties of undefined (reading 'src')" at render time. The fix
 * is to backslash-escape the dot (`geo\.src`).
 *
 * Escaping every dot blindly is unsafe — dots also appear in `filter`/`expr`
 * strings (`datum.rank <= 10`) and shorthand. Instead this only rewrites field
 * references whose value is *exactly* a known result column name, so it never
 * touches expressions or computed fields.
 */

/** Keys whose string value (or string array entries) reference a data field. */
const FIELD_NAME_KEYS = new Set(['field', 'groupby']);

const escapeDots = (name: string): string => name.replace(/\./g, '\\.');

const collectColumnNames = (columns: EsqlEsqlColumnInfo[] | undefined): Set<string> =>
  new Set(
    (columns ?? [])
      .map((column) => column.name)
      .filter((name): name is string => typeof name === 'string' && name.includes('.'))
  );

const escapeIfKnownColumn = (value: unknown, columnNames: ReadonlySet<string>): unknown =>
  typeof value === 'string' && columnNames.has(value) ? escapeDots(value) : value;

const walk = (value: unknown, columnNames: ReadonlySet<string>): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, columnNames));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => {
        if (FIELD_NAME_KEYS.has(key)) {
          if (Array.isArray(val)) {
            return [key, val.map((entry) => escapeIfKnownColumn(entry, columnNames))];
          }
          return [key, escapeIfKnownColumn(val, columnNames)];
        }
        return [key, walk(val, columnNames)];
      })
    );
  }

  return value;
};

/**
 * Return a deep copy of a Vega spec where every `field` / `groupby` reference
 * that exactly matches a dotted ES|QL result column name has its dots
 * backslash-escaped, so Vega reads the flat column instead of attempting
 * nested-object access. References to columns without dots, expression strings,
 * and computed fields are left untouched.
 */
export const escapeDottedFieldReferences = <T>(
  spec: T,
  columns: EsqlEsqlColumnInfo[] | undefined
): T => {
  const columnNames = collectColumnNames(columns);
  if (columnNames.size === 0) {
    return spec;
  }
  return walk(spec, columnNames) as T;
};
