/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getSerializedErrorMessage = (reason: unknown): string | undefined => {
  if (!isRecord(reason)) return undefined;
  const error = reason.error;
  if (!isRecord(error)) return undefined;
  const message = error.message;
  return typeof message === 'string' ? message : undefined;
};
