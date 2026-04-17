/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_STREAM_NAME_LENGTH = 200;

/**
 * Reserved stream names.
 * These are the names that are not allowed to be used as data stream names by Elasticsearch.
 * @see https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream#operation-indices-create-data-stream-path
 */
export const RESERVED_STREAM_NAMES = ['.', '..'];

/**
 * Invalid stream name prefixes.
 * These are the prefixes that Elasticsearch does not allow in data stream names.
 * @see https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream#operation-indices-create-data-stream-path
 */
export const INVALID_STREAM_NAME_PREFIXES = ['-', '_', '+', '.ds-'];

/**
 * Characters that are not allowed in stream names.
 * These are the characters that Elasticsearch does not allow in index template/data stream names.
 * @see https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create-data-stream#operation-indices-create-data-stream-path
 */
export const INVALID_STREAM_NAME_CHARACTERS = [
  ' ',
  '"',
  '\\',
  '*',
  ',',
  '#',
  ':',
  '/',
  '<',
  '>',
  '?',
  '|',
];

export type StreamNameValidationError =
  | 'empty'
  | 'tooLong'
  | 'reservedName'
  | 'invalidPrefix'
  | 'uppercase'
  | 'invalidCharacter';

interface StreamNameValidationMetaByError {
  empty: never;
  tooLong: { maxLength: number };
  reservedName: { name: string };
  invalidPrefix: { prefix: string };
  uppercase: never;
  invalidCharacter: { character: string };
}

type StreamNameValidationInvalidResult = {
  [E in StreamNameValidationError]: {
    valid: false;
    error: E;
    message: string;
    meta?: StreamNameValidationMetaByError[E];
  };
}[StreamNameValidationError];

export type StreamNameValidationResult = { valid: true } | StreamNameValidationInvalidResult;

/**
 * Validates a stream name against Elasticsearch naming requirements.
 * Returns an object indicating validity and an error message if invalid.
 */
export const validateStreamName = (name: string): StreamNameValidationResult => {
  if (!name || name.length === 0) {
    return { valid: false, error: 'empty', message: 'Stream name must not be empty.' };
  }

  if (name.length > MAX_STREAM_NAME_LENGTH) {
    return {
      valid: false,
      error: 'tooLong',
      message: `Stream name cannot be longer than ${MAX_STREAM_NAME_LENGTH} characters.`,
      meta: { maxLength: MAX_STREAM_NAME_LENGTH },
    };
  }

  if (RESERVED_STREAM_NAMES.includes(name)) {
    return {
      valid: false,
      error: 'reservedName',
      message: `Stream name cannot be "${name}".`,
      meta: { name },
    };
  }

  for (const prefix of INVALID_STREAM_NAME_PREFIXES) {
    if (name.startsWith(prefix)) {
      return {
        valid: false,
        error: 'invalidPrefix',
        message: `Stream name cannot start with "${prefix}".`,
        meta: { prefix },
      };
    }
  }

  for (const char of INVALID_STREAM_NAME_CHARACTERS) {
    if (name.includes(char)) {
      const charDisplay = char === ' ' ? 'spaces' : `"${char}"`;
      return {
        valid: false,
        error: 'invalidCharacter',
        message: `Stream name cannot contain ${charDisplay}.`,
        meta: { character: char },
      };
    }
  }

  if (name !== name.toLowerCase()) {
    return {
      valid: false,
      error: 'uppercase',
      message: 'Stream name cannot contain uppercase characters.',
    };
  }

  return { valid: true };
};
