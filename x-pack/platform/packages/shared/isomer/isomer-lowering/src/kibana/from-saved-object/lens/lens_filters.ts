/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticBag } from './diagnostics';
import { escapeField, type EsqlScalar, esqlScalarLiteral, isEsqlScalar } from './esql';
import { translateKqlToEsql } from './kql_to_esql';
import type { LensState } from './types';

interface KibanaFilterMeta {
  disabled?: boolean;
  negate?: boolean;
  key?: unknown;
  field?: unknown;
  type?: unknown;
  params?: unknown;
}

const fieldName = (meta: KibanaFilterMeta): string | undefined => {
  if (typeof meta.field === 'string' && meta.field.length > 0) {
    return meta.field;
  }
  if (typeof meta.key === 'string' && meta.key.length > 0) {
    return meta.key;
  }
  return undefined;
};

const phraseValue = (params: unknown): EsqlScalar | undefined => {
  if (isEsqlScalar(params)) {
    return params;
  }
  if (params && typeof params === 'object' && 'query' in params) {
    const { query } = params;
    if (isEsqlScalar(query)) {
      return query;
    }
  }
  return undefined;
};

const phrasesValues = (params: unknown): EsqlScalar[] | undefined => {
  if (Array.isArray(params) && params.every(isEsqlScalar)) {
    return params;
  }
  if (params && typeof params === 'object' && 'query' in params) {
    const { query } = params;
    if (Array.isArray(query) && query.every(isEsqlScalar)) {
      return query;
    }
  }
  return undefined;
};

const equality = (field: string, value: EsqlScalar): string =>
  `${escapeField(field)} == ${esqlScalarLiteral(value)}`;

/**
 * Lower a Kibana saved-object filter (Lens `state.filters` or dashboard
 * `searchSourceJSON.filter`) to an ES|QL predicate. Phrase and phrases are
 * the shapes this dashboard contract actually stores.
 */
export const lowerKibanaFilterToEsql = (raw: Record<string, unknown>): string | undefined => {
  const meta = (raw.meta ?? {}) as KibanaFilterMeta;
  if (meta.disabled) {
    return undefined;
  }
  const field = fieldName(meta);
  if (!field) {
    return undefined;
  }
  let predicate: string | undefined;
  if (meta.type === 'phrase') {
    const value = phraseValue(meta.params);
    if (value === undefined) {
      return undefined;
    }
    predicate = equality(field, value);
  } else if (meta.type === 'phrases') {
    const values = phrasesValues(meta.params);
    if (!values || values.length === 0) {
      return undefined;
    }
    predicate =
      values.length === 1
        ? equality(field, values[0]!)
        : `${escapeField(field)} IN (${values.map(esqlScalarLiteral).join(', ')})`;
  } else {
    return undefined;
  }
  return meta.negate ? `NOT (${predicate})` : predicate;
};

export const collectLensStatePredicates = (
  state: LensState,
  diagnostics: DiagnosticBag
): string[] => {
  const predicates: string[] = [];
  for (const filter of state.filters ?? []) {
    if (!filter || typeof filter !== 'object') {
      continue;
    }
    const meta = (filter as { meta?: KibanaFilterMeta }).meta ?? {};
    if (meta.disabled) {
      continue;
    }
    const esql = lowerKibanaFilterToEsql(filter);
    if (esql) {
      predicates.push(esql);
      continue;
    }
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.filter-unsupported',
      message: `Lens filter on "${
        fieldName(meta) ?? 'unknown field'
      }" could not be lowered to ES|QL`,
    });
  }

  const query = state.query;
  if (!query?.query || query.query.trim() === '') {
    return predicates;
  }
  const language = query.language ?? 'kuery';
  if (language === 'kuery' || language === 'kql') {
    const kql = translateKqlToEsql(query.query, escapeField);
    if (kql && kql !== 'true') {
      predicates.push(kql);
    } else if (kql !== 'true') {
      diagnostics.push({
        level: 'warn',
        code: 'lens.formBased.query-unsupported',
        message: 'Lens kuery query could not be lowered to ES|QL',
      });
    }
  } else if (language !== 'esql') {
    diagnostics.push({
      level: 'warn',
      code: 'lens.formBased.query-unsupported',
      message: `Lens query language "${language}" is not lowered to ES|QL`,
    });
  }
  return predicates;
};
