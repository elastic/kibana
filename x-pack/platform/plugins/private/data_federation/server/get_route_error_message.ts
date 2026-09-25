/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

/**
 * The reason in an Elasticsearch error response body. The client error's own `message`
 * flattens the whole `caused_by` / `root_cause` chain into one string, which is not
 * something to show a user.
 */
const getElasticsearchErrorReason = (error: unknown): string | undefined => {
  if (!isRecord(error) || !isRecord(error.meta) || !isRecord(error.meta.body)) {
    return undefined;
  }

  const { error: bodyError } = error.meta.body;
  if (!isRecord(bodyError)) {
    return nonEmptyString(bodyError);
  }

  const rootCauses: unknown[] = Array.isArray(bodyError.root_cause) ? bodyError.root_cause : [];
  const [rootCause] = rootCauses;
  return (
    nonEmptyString(bodyError.reason) ??
    (isRecord(rootCause) ? nonEmptyString(rootCause.reason) : undefined)
  );
};

export const getRouteErrorMessage = (error: unknown): string => {
  const elasticsearchReason = getElasticsearchErrorReason(error);
  if (elasticsearchReason) {
    return elasticsearchReason;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error)) {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
    if (isRecord(error.error) && typeof error.error.reason === 'string') {
      return error.error.reason;
    }
    if (typeof error.reason === 'string' && error.reason.trim()) {
      return error.reason;
    }
  }
  return String(error);
};

/** HTTP status carried by an Elasticsearch client error, when it exposes a usable one. */
export const getRouteErrorStatusCode = (error: unknown): number | undefined => {
  if (!isRecord(error)) {
    return undefined;
  }

  const fromError = error.statusCode;
  const fromMeta = isRecord(error.meta) ? error.meta.statusCode : undefined;
  const statusCode = typeof fromError === 'number' ? fromError : fromMeta;

  if (typeof statusCode !== 'number' || statusCode < 400 || statusCode > 599) {
    return undefined;
  }
  return statusCode;
};
