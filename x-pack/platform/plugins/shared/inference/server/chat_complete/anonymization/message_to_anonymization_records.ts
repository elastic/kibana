/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message } from '@kbn/inference-common';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';
import type { AnonymizationRecord } from './types';

/**
 * Escape a single JSON Pointer token per RFC-6901:
 *  - "~" -> "~0"
 *  - "/" -> "~1"
 */
function escapePointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Recursively walk a value and collect only string leaves as path-value tuples.
 * Keys in the returned tuples are absolute JSON Pointers from the message root,
 * rooted at the top-level key returned by getAnonymizableMessageParts (e.g. "/content", "/response").
 */
function collectStringEntries(value: unknown, basePointer: string): Array<[string, string]> {
  if (typeof value === 'string') {
    return [[basePointer, value]];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, i) => collectStringEntries(item, `${basePointer}/${i}`));
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // Skip images entirely (do not traverse into source.{data,mimeType})
    if (obj.type === 'image') {
      return [];
    }

    // For text content objects, only collect the text field to avoid adding pointers
    // for the `type` property.
    if (obj.type === 'text' && typeof obj.text === 'string') {
      return [[`${basePointer}/text`, obj.text]];
    }

    return Object.entries(obj).flatMap(([k, v]) => {
      const next = `${basePointer}/${escapePointerToken(k)}`;
      return collectStringEntries(v, next);
    });
  }

  // Non-string primitives (number/boolean/null/undefined) are ignored
  return [];
}

/**
 * Flattens anonymizable parts of a message into a map of JSON Pointer -> string leaf.
 */
export function messageToAnonymizationRecords(message: Message): AnonymizationRecord {
  const anonymizableParts = getAnonymizableMessageParts(message);

  const entries = Object.entries(anonymizableParts).flatMap(([key, value]) => {
    const basePath = `/${escapePointerToken(key)}`;
    return collectStringEntries(value, basePath);
  });

  return Object.fromEntries(entries);
}
