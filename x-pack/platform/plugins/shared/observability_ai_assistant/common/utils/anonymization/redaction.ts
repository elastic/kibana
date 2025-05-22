/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DetectedEntity } from '../../types';
/** Regex matching object‑hash placeholders (40 hex chars) */
export const HASH_REGEX = /[0-9a-f]{40}/g;
/**
 * Replace each entity span in the original with its hash.
 */

export function redactEntities(original: string, entities: DetectedEntity[]): string {
  const sortedEntities = entities.slice().sort((a, b) => a.start_pos - b.start_pos);
  let redacted = '';
  let currentIndex = 0;
  for (const ent of sortedEntities) {
    redacted += original.substring(currentIndex, ent.start_pos);
    redacted += `${ent.hash}`;
    currentIndex = ent.end_pos;
  }
  redacted += original.substring(currentIndex);
  return redacted;
}
/**
 * Replace every placeholder in a string with its real value
 * (taken from `hashMap`).
 */
export function unhashString(
  contentWithHashes: string,
  hashMap: Map<string, { value: string }>
): string {
  return contentWithHashes.replace(HASH_REGEX, (h) => hashMap.get(h)?.value ?? h);
}
