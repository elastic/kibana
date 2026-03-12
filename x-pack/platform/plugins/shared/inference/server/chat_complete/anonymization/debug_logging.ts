/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const ANONYMIZATION_DEBUG_ENV_VAR = 'INFERENCE_LOG_ANONYMIZATION_DEBUG';

export const shouldLogAnonymizationDebug = () =>
  process.env[ANONYMIZATION_DEBUG_ENV_VAR] === 'true';

export const stringifyForLogs = (value: unknown, maxLength = 3000): string => {
  try {
    const serialized = JSON.stringify(value);
    if (!serialized) return 'null';
    return serialized.length > maxLength
      ? `${serialized.slice(0, maxLength)}...<truncated>`
      : serialized;
  } catch {
    return '"[unserializable]"';
  }
};
