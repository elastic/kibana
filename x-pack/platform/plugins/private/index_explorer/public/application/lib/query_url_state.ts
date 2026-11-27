/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlParam, EsqlParamType } from '../../../common/types';

export interface QueryViewState {
  readonly query?: string;
  readonly values: Record<string, string>;
  readonly types: Record<string, EsqlParamType>;
}

const QUERY_KEY = 'esql';
const VALUE_PREFIX = 'p.';
const TYPE_PREFIX = 't.';
const PARAM_TYPES: readonly EsqlParamType[] = ['string', 'number', 'boolean'];

/** Parses `?esql=...&p.name=value&t.name=number` into query view state. */
export function parseQueryViewState(search: string): QueryViewState {
  const params = new URLSearchParams(search);
  const values: Record<string, string> = {};
  const types: Record<string, EsqlParamType> = {};

  params.forEach((value, key) => {
    if (key.startsWith(VALUE_PREFIX)) {
      values[key.slice(VALUE_PREFIX.length)] = value;
    } else if (key.startsWith(TYPE_PREFIX)) {
      const type = PARAM_TYPES.find((candidate) => candidate === value);
      if (type) {
        types[key.slice(TYPE_PREFIX.length)] = type;
      }
    }
  });

  return { query: params.get(QUERY_KEY) ?? undefined, values, types };
}

/** Serializes query view state; the query itself is omitted for canned queries. */
export function serializeQueryViewState({
  query,
  params,
}: {
  query?: string;
  params: readonly EsqlParam[];
}): string {
  const searchParams = new URLSearchParams();
  if (query !== undefined) {
    searchParams.set(QUERY_KEY, query);
  }
  for (const { name, type, value } of params) {
    searchParams.set(`${VALUE_PREFIX}${name}`, value);
    if (type !== 'string') {
      searchParams.set(`${TYPE_PREFIX}${name}`, type);
    }
  }
  return searchParams.toString();
}
