/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const UUID_V4_EXACT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_V4_FIND = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export function extractReplacementsId(additionalKwargs: unknown): string | undefined {
  if (!isRecord(additionalKwargs)) {
    return undefined;
  }

  const anonymization = additionalKwargs.anonymization;
  if (!isRecord(anonymization)) {
    return undefined;
  }

  const replacementsId = anonymization.replacementsId;
  if (typeof replacementsId !== 'string' || replacementsId.length === 0) {
    return undefined;
  }

  if (UUID_V4_EXACT.test(replacementsId)) {
    return replacementsId;
  }

  // Defensive normalization: if upstream chunk concatenation ever duplicates the UUID,
  // extract the first UUID-shaped token so persistence/UI still use a valid ID.
  const firstUuidMatch = replacementsId.match(UUID_V4_FIND);
  return firstUuidMatch?.[0];
}
