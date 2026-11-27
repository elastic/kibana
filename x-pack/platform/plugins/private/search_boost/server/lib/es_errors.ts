/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';

/** Elasticsearch rejects a lookup the user has no index privileges for instead of listing nothing. */
export const emptyIfForbidden = async <T>(request: Promise<T>, empty: T): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof errors.ResponseError && error.statusCode === 403) {
      return empty;
    }
    throw error;
  }
};
