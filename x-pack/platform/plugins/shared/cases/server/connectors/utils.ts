/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Longest incident id a change notification may name; matches the service account workload id limit. */
export const MAX_NOTIFICATION_EXTERNAL_ID_LENGTH = 512;
export const MAX_NOTIFICATION_TIMESTAMP_LENGTH = 64;

export const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A non-blank string no longer than `maxLength`, or `undefined`. */
export const asBoundedString = (value: unknown, maxLength: number): string | undefined => {
  const text = asString(value)?.trim();
  return text != null && text.length > 0 && text.length <= maxLength ? text : undefined;
};
