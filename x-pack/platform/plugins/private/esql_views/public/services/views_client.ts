/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { getViewApiPath } from '../../common';

export interface EsqlViewRecord {
  name: string;
  query: string;
}

interface HttpFetchErrorLike {
  response?: { status?: number };
}

const isNotFoundError = (error: unknown): boolean =>
  (error as HttpFetchErrorLike)?.response?.status === 404;

/** Fetches a single view from the real, cluster-backed `_query/view` API. Returns `undefined` if it doesn't exist. */
export const fetchView = async (
  http: HttpStart,
  name: string
): Promise<EsqlViewRecord | undefined> => {
  try {
    return await http.get<EsqlViewRecord>(getViewApiPath(name));
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

/** Creates or updates (upserts) a view in Elasticsearch. */
export const upsertView = async (http: HttpStart, name: string, query: string): Promise<void> => {
  await http.put(getViewApiPath(name), { body: JSON.stringify({ query }) });
};

/** Deletes a view from Elasticsearch. */
export const deleteView = async (http: HttpStart, name: string): Promise<void> => {
  await http.delete(getViewApiPath(name));
};
