/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSelfFetchQuery } from '@kbn/core-http-server';

export type QueryScalar = Exclude<HttpSelfFetchQuery[string], unknown[]>;

export const isQueryScalar = (value: unknown): value is QueryScalar =>
  value === undefined ||
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const isQueryArrayMember = (value: unknown): value is Exclude<QueryScalar, null | undefined> =>
  value != null && isQueryScalar(value);

/**
 * Finds query parameters holding a value a query string cannot carry.
 *
 * @param queryParams - Query parameters (as returned by an API's `buildRequest`).
 * @returns The names of parameters that are neither a scalar nor an array of non-nullish scalars.
 */
export const getUnusableQueryParams = (queryParams: Record<string, unknown> = {}): string[] =>
  Object.entries(queryParams)
    .filter(([, value]) =>
      Array.isArray(value) ? !value.every(isQueryArrayMember) : !isQueryScalar(value)
    )
    .map(([key]) => key);

/**
 * Narrows query parameters to the shape `selfClient.fetch` accepts.
 *
 * @param queryParams - Query parameters (as returned by an API's `buildRequest`). Callers should
 * reject anything {@link getUnusableQueryParams} names first, since values a query string cannot
 * carry are dropped here rather than reported.
 * @returns The query to fetch with, or undefined when the API takes no query parameters.
 */
export const toSelfFetchQuery = (
  queryParams: Record<string, unknown> | undefined
): HttpSelfFetchQuery | undefined => {
  if (queryParams == null) {
    return undefined;
  }
  return Object.entries(queryParams).reduce<HttpSelfFetchQuery>((query, [key, value]) => {
    if (Array.isArray(value)) {
      query[key] = value.map((item) => String(item));
    } else if (isQueryScalar(value)) {
      query[key] = value;
    }
    return query;
  }, {});
};
