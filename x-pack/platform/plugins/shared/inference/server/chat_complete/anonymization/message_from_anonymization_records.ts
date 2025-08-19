/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import type { AnonymizationRecord } from './types';

/**
 * RFC-6901 unescape for a single JSON Pointer token:
 *  - "~1" -> "/"
 *  - "~0" -> "~"
 */
function unescapePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/**
 * Set a string leaf on an object by JSON Pointer.
 * Throws an error if the path is invalid or doesn't exist.
 */
function setByPointer(root: Message, pointer: string, value: string): void {
  if (!pointer || pointer[0] !== '/') {
    throw new Error('Invalid JSON Pointer format');
  }

  const pathParts = pointer.split('/').slice(1).map(unescapePointerToken);

  // Navigate to the parent of the target location
  let cursor: any = root; // Start at the root message
  for (let i = 0; i < pathParts.length - 1; i++) {
    const pathPart = pathParts[i];

    if (Array.isArray(cursor)) {
      // Convert string path part to numeric array index
      cursor = cursor[Number(pathPart)];
    } else if (cursor && typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[pathPart];
    } else {
      throw new Error('Failed to set anonymized value');
    }
  }

  // Set the value at the final location
  const leaf = pathParts[pathParts.length - 1];
  if (Array.isArray(cursor)) {
    // Set array element at numeric index
    cursor[Number(leaf)] = value;
  } else if (cursor && typeof cursor === 'object') {
    // Set object property
    (cursor as Record<string, unknown>)[leaf] = value;
  } else {
    throw new Error('Failed to set anonymized value');
  }
}

/**
 * Apply a flattened AnonymizationRecord (JSON Pointer -> string) onto a clone of `original`.
 */
export function messageFromAnonymizationRecords(
  original: Message,
  anonymizedRecord: AnonymizationRecord
): Message {
  const cloned: Message = structuredClone(original);

  for (const [pointer, anonymizedValue] of Object.entries(anonymizedRecord)) {
    // in practice, should always be a string
    if (typeof anonymizedValue !== 'string') continue;
    setByPointer(cloned, pointer, anonymizedValue);
  }

  return cloned;
}
