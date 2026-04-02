/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@kbn/evals';

export interface DeduplicationResult<T> {
  unique: T[];
  duplicates: Array<{ original: T; duplicate: T; similarity: number }>;
}

/**
 * Deduplicates examples based on exact input content hashing.
 *
 * Uses a content hash of the serialized input to detect exact duplicates.
 * For fuzzy deduplication, use `deduplicateBySimilarity` instead.
 */
export const deduplicateExact = <T extends Example>(examples: T[]): DeduplicationResult<T> => {
  const seen = new Map<string, T>();
  const unique: T[] = [];
  const duplicates: DeduplicationResult<T>['duplicates'] = [];

  for (const example of examples) {
    const key = JSON.stringify(example.input ?? {});
    const existing = seen.get(key);
    if (existing) {
      duplicates.push({ original: existing, duplicate: example, similarity: 1.0 });
    } else {
      seen.set(key, example);
      unique.push(example);
    }
  }

  return { unique, duplicates };
};

/**
 * Deduplicates examples using Jaccard similarity on tokenized input.
 *
 * @param examples - Array of examples
 * @param threshold - Similarity threshold above which examples are considered duplicates (0-1)
 * @returns Deduplicated result with unique examples and detected duplicates
 */
export const deduplicateBySimilarity = <T extends Example>(
  examples: T[],
  threshold: number = 0.85
): DeduplicationResult<T> => {
  const unique: T[] = [];
  const duplicates: DeduplicationResult<T>['duplicates'] = [];
  const tokenSets: Set<string>[] = [];

  for (const example of examples) {
    const tokens = tokenize(JSON.stringify(example.input ?? {}));
    let isDuplicate = false;

    for (let i = 0; i < unique.length; i++) {
      const similarity = jaccardSimilarity(tokens, tokenSets[i]);
      if (similarity >= threshold) {
        duplicates.push({ original: unique[i], duplicate: example, similarity });
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(example);
      tokenSets.push(tokens);
    }
  }

  return { unique, duplicates };
};

/**
 * Tokenizes a string into a set of word-level tokens.
 */
const tokenize = (text: string): Set<string> => {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0)
  );
};

/**
 * Computes Jaccard similarity between two token sets.
 */
const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
  if (setA.size === 0 && setB.size === 0) {
    return 1.0;
  }

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1.0 : intersection / union;
};
