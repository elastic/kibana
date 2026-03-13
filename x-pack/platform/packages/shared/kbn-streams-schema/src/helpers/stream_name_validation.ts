/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_STREAM_NAME_LENGTH = 200;

/**
 * Characters that are not allowed in stream names.
 * These are the characters that Elasticsearch does not allow in index template/data stream names.
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html#indices-create-api-path-params
 */
export const INVALID_STREAM_NAME_CHARACTERS = [' ', '"', '\\', '*', ',', '/', '<', '>', '?', '|'];

/**
 * Validates a stream name against Elasticsearch naming requirements.
 * Returns an object indicating validity and an error message if invalid.
 */
export const validateStreamName = (
  name: string
): { valid: true } | { valid: false; message: string } => {
  if (!name || name.length === 0) {
    return { valid: false, message: 'Stream name must not be empty.' };
  }

  if (name.length > MAX_STREAM_NAME_LENGTH) {
    return {
      valid: false,
      message: `Stream name cannot be longer than ${MAX_STREAM_NAME_LENGTH} characters.`,
    };
  }

  if (name !== name.toLowerCase()) {
    return { valid: false, message: 'Stream name cannot contain uppercase characters.' };
  }

  for (const char of INVALID_STREAM_NAME_CHARACTERS) {
    if (name.includes(char)) {
      const charDisplay = char === ' ' ? 'spaces' : `"${char}"`;
      return { valid: false, message: `Stream name cannot contain ${charDisplay}.` };
    }
  }

  return { valid: true };
};
