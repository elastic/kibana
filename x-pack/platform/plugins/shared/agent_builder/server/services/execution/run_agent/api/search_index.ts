/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { distance } from 'fastest-levenshtein';
import type { ApiRegistry, ApiRegistryMeta } from './types';

const K1 = 1.2;
const B = 0.75;

const FIELD_WEIGHTS = {
  id: 3,
  name: 2,
  namespace: 2,
  description: 1,
} as const;

const MIN_SUGGESTION_DISTANCE = 2;
const SUGGESTION_DISTANCE_RATIO = 0.15;

interface Posting {
  doc: number;
  termFrequency: number;
}

export interface ApiSearchIndex {
  /**
   * Ranks the indexed operations against a free-text query with BM25.
   *
   * @param query - Natural language description or (partial) API identifier.
   * @param limit - Maximum number of operations to return.
   * @returns The top `limit` operations. An operation whose identifier equals the query
   * (case-insensitively) comes first, and ties are ordered by identifier.
   */
  search: (query: string, limit: number) => ApiRegistryMeta[];
  /**
   * Finds the identifiers within a small edit distance of one that does not exist.
   *
   * @param apiId - The unknown API identifier.
   * @param limit - Maximum number of identifiers to return.
   * @returns The close identifiers, nearest first. Empty when none is close enough.
   */
  suggest: (apiId: string, limit: number) => string[];
}

/**
 * Splits text into lowercase alphanumeric tokens, so identifiers such as
 * `"alerting-v2.post-rules"` and prose index the same way.
 */
export const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

const weightedFields = (entry: ApiRegistryMeta): Array<[string, number]> => [
  [entry.id, FIELD_WEIGHTS.id],
  [entry.name, FIELD_WEIGHTS.name],
  [entry.namespace ?? '', FIELD_WEIGHTS.namespace],
  [entry.description, FIELD_WEIGHTS.description],
];

/**
 * Builds an in-memory BM25 index over a registry manifest. Each field contributes its tokens to
 * the term frequency with a weight, so a match in the identifier counts for more than one in the
 * description.
 *
 * @param manifest - The operations of a single target, whose corpus statistics drive the ranking.
 * @returns The index to search.
 */
export const createApiSearchIndex = (manifest: readonly ApiRegistryMeta[]): ApiSearchIndex => {
  const postings = new Map<string, Posting[]>();

  const docLengths = manifest.map((entry, doc) => {
    const termFrequencies = new Map<string, number>();
    for (const [text, weight] of weightedFields(entry)) {
      for (const token of tokenize(text)) {
        termFrequencies.set(token, (termFrequencies.get(token) ?? 0) + weight);
      }
    }

    let docLength = 0;
    for (const [token, termFrequency] of termFrequencies) {
      const tokenPostings = postings.get(token);
      if (tokenPostings) {
        tokenPostings.push({ doc, termFrequency });
      } else {
        postings.set(token, [{ doc, termFrequency }]);
      }
      docLength += termFrequency;
    }
    return docLength;
  });

  const docCount = manifest.length;
  const avgDocLength =
    docCount === 0 ? 0 : docLengths.reduce((sum, docLength) => sum + docLength, 0) / docCount;
  const lowercaseIds = manifest.map(({ id }) => id.toLowerCase());

  const search = (query: string, limit: number): ApiRegistryMeta[] => {
    const scores = new Float64Array(docCount);
    // Every BM25 contribution is strictly positive, so a zero score means the doc is untouched.
    const touched: number[] = [];

    for (const token of tokenize(query)) {
      const tokenPostings = postings.get(token);
      if (!tokenPostings) {
        continue;
      }

      const documentFrequency = tokenPostings.length;
      const idf = Math.log(1 + (docCount - documentFrequency + 0.5) / (documentFrequency + 0.5));
      for (const { doc, termFrequency } of tokenPostings) {
        if (scores[doc] === 0) {
          touched.push(doc);
        }
        const lengthNorm = 1 - B + (B * docLengths[doc]) / avgDocLength;
        scores[doc] += (idf * (termFrequency * (K1 + 1))) / (termFrequency + K1 * lengthNorm);
      }
    }

    const exactId = query.trim().toLowerCase();
    const isExact = (doc: number): number => (lowercaseIds[doc] === exactId ? 1 : 0);

    touched.sort(
      (left, right) =>
        isExact(right) - isExact(left) ||
        scores[right] - scores[left] ||
        manifest[left].id.localeCompare(manifest[right].id)
    );

    return touched.slice(0, limit).map((doc) => manifest[doc]);
  };

  const suggest = (apiId: string, limit: number): string[] => {
    const lowercaseApiId = apiId.toLowerCase();
    const maxDistance = Math.max(
      MIN_SUGGESTION_DISTANCE,
      Math.floor(lowercaseApiId.length * SUGGESTION_DISTANCE_RATIO)
    );

    return manifest
      .map(({ id }, doc) => ({ id, editDistance: distance(lowercaseApiId, lowercaseIds[doc]) }))
      .filter(({ editDistance }) => editDistance <= maxDistance)
      .sort(
        (left, right) => left.editDistance - right.editDistance || left.id.localeCompare(right.id)
      )
      .slice(0, limit)
      .map(({ id }) => id);
  };

  return { search, suggest };
};

const indexCache = new WeakMap<ApiRegistry, ApiSearchIndex>();

/**
 * Returns the search index of a registry, building it on first use.
 *
 * @param registry - The target registry whose manifest is indexed.
 * @returns The index, cached for the lifetime of the registry.
 */
export const getApiSearchIndex = (registry: ApiRegistry): ApiSearchIndex => {
  const cached = indexCache.get(registry);
  if (cached) {
    return cached;
  }

  const index = createApiSearchIndex(registry.manifest);
  indexCache.set(registry, index);
  return index;
};
