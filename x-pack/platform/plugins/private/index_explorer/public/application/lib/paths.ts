/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ROUTES = {
  home: '/',
  query: '/query',
  cannedQuery: '/queries/:queryId',
  index: '/index/:index',
  document: '/index/:index/doc/:id',
} as const;

function withSearch(path: string, search?: string): string {
  return search ? `${path}?${search}` : path;
}

/** Builds the app-relative path of an index table view. */
export function indexPath(index: string, search?: string): string {
  return withSearch(`/index/${encodeURIComponent(index)}`, search);
}

/** Builds the app-relative path of a single document view. */
export function documentPath(index: string, id: string): string {
  return `/index/${encodeURIComponent(index)}/doc/${encodeURIComponent(id)}`;
}

/** Builds the app-relative path of the ad-hoc ES|QL query page. */
export function queryPath(search?: string): string {
  return withSearch(ROUTES.query, search);
}

/** Builds the app-relative path of a canned query. */
export function cannedQueryPath(queryId: string, search?: string): string {
  return withSearch(`/queries/${encodeURIComponent(queryId)}`, search);
}

/** Decodes a route parameter, tolerating values the router has already decoded. */
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
