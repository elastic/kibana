/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DetectedEntity } from '../../types';

/** Regex matching object‑hash placeholders (40 hex chars) */
export const HASH_REGEX = /[0-9a-f]{40}/g;

/** Default model ID for named entity recognition */
export const NER_MODEL_ID = 'elastic__distilbert-base-uncased-finetuned-conll03-english';

/**
 * Replace each entity span in the original with its hash.
 */
export function redactEntities(original: string, entities: DetectedEntity[]): string {
  let redacted = original;
  entities
    .slice()
    .sort((a, b) => b.start_pos - a.start_pos)
    .forEach((e) => {
      redacted = redacted.slice(0, e.start_pos) + e.hash + redacted.slice(e.end_pos);
    });

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
