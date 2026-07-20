/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';

interface EsSearchErrorLike {
  statusCode?: number;
  message?: string;
  attributes?: {
    error?: { reason?: string };
    rawResponse?: { status?: number };
  };
}

/**
 * True when the current user cannot see the episode/rule-events data backing an
 * ES|QL search.
 */
export const isInaccessibleEpisodeDataError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const esError = error as EsSearchErrorLike & IHttpFetchError;

  const status =
    esError.attributes?.rawResponse?.status ?? esError.statusCode ?? esError.response?.status;
  if (status === 403 || status === 404) {
    return true;
  }

  const reason = esError.attributes?.error?.reason;
  const message = typeof esError.message === 'string' ? esError.message : undefined;
  return /unknown index/i.test(`${reason ?? ''} ${message ?? ''}`);
};
