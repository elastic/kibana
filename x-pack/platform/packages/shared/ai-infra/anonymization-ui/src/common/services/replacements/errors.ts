/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectRecord } from '../../utils/is_object_record';
import { getHttpErrorBody, getHttpStatusCode } from '../http_error_utils';

export type ReplacementsApiErrorKind =
  | 'forbidden'
  | 'unauthorized'
  | 'not_found'
  | 'network'
  | 'unknown';

export interface ReplacementsApiError extends Error {
  kind: ReplacementsApiErrorKind;
  statusCode?: number;
  body?: unknown;
}

const toMessage = (statusCode?: number, body?: unknown): string => {
  if (isObjectRecord(body) && typeof body.message === 'string') {
    return body.message;
  }
  if (statusCode) {
    return `Replacements API request failed with status ${statusCode}`;
  }
  return 'Replacements API request failed';
};

class ReplacementsApiErrorImpl extends Error implements ReplacementsApiError {
  constructor(
    public kind: ReplacementsApiErrorKind,
    public statusCode: number | undefined,
    public body: unknown
  ) {
    super(toMessage(statusCode, body));
    this.name = 'ReplacementsApiError';
  }
}

export const mapReplacementsApiError = (error: unknown): ReplacementsApiError => {
  const statusCode = getHttpStatusCode(error);
  const body = getHttpErrorBody(error);

  if (statusCode === 403) {
    return new ReplacementsApiErrorImpl('forbidden', statusCode, body);
  }
  if (statusCode === 401) {
    return new ReplacementsApiErrorImpl('unauthorized', statusCode, body);
  }
  if (statusCode === 404) {
    return new ReplacementsApiErrorImpl('not_found', statusCode, body);
  }
  if (statusCode === 0 || !statusCode) {
    return new ReplacementsApiErrorImpl('network', statusCode, body);
  }
  return new ReplacementsApiErrorImpl('unknown', statusCode, body);
};
