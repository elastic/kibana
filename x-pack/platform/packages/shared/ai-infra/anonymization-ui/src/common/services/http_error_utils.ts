/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectRecord } from '../utils/is_object_record';

const toNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;

export const getHttpStatusCode = (error: unknown): number | undefined => {
  if (!isObjectRecord(error)) {
    return undefined;
  }

  const topLevelStatus = toNumber(error.statusCode);
  if (topLevelStatus !== undefined) {
    return topLevelStatus;
  }

  const metaStatus = isObjectRecord(error.meta) ? toNumber(error.meta.statusCode) : undefined;
  if (metaStatus !== undefined) {
    return metaStatus;
  }

  const responseStatus = isObjectRecord(error.response)
    ? toNumber(error.response.status)
    : undefined;
  if (responseStatus !== undefined) {
    return responseStatus;
  }

  return undefined;
};

export const getHttpErrorBody = (error: unknown): unknown => {
  if (!isObjectRecord(error)) {
    return undefined;
  }

  if ('body' in error) {
    return error.body;
  }

  if (isObjectRecord(error.meta) && 'body' in error.meta) {
    return error.meta.body;
  }

  if (isObjectRecord(error.response) && 'body' in error.response) {
    return error.response.body;
  }

  return undefined;
};
