/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const EDGE_CASE_INDEX = 'isomer-corpus-edge-cases';
export const EDGE_CASE_TIME_FIELD = '@timestamp';

/** Absolute range that holds every edge-case document; the edge-case dashboards pin it. */
export const EDGE_CASE_TIME_RANGE = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-08T00:00:00.000Z',
} as const;

/** More categories than any terms limit in the corpus, so terms buckets produce an Other bucket. */
export const EDGE_CASE_CATEGORIES = [
  'alpha',
  'bravo',
  'charlie',
  'delta',
  'echo',
  'foxtrot',
  'golf',
  'hotel',
  'india',
  'juliett',
  'kilo',
  'lima',
] as const;

export const EDGE_CASE_TAGS = ['red', 'green', 'blue', 'cyan', 'magenta'] as const;

export const EDGE_CASE_LONG_LABELS = [
  'A deliberately long category label that should be truncated or wrapped by every renderer that draws it',
  'Another very long label, with punctuation: commas, colons; and "quotes" — plus an em dash',
  'Short',
  'Ünïcödé label with accents, CJK 漢字 and an emoji 🚀 to exercise text measurement',
] as const;

export const EDGE_CASE_MAPPINGS = {
  properties: {
    [EDGE_CASE_TIME_FIELD]: { type: 'date' },
    category: { type: 'keyword' },
    tags: { type: 'keyword' },
    long_label: { type: 'keyword' },
    value: { type: 'double' },
    signed: { type: 'double' },
    huge: { type: 'double' },
    tiny: { type: 'double' },
    always_null: { type: 'double' },
  },
} as const;

export interface EdgeCaseDocument {
  [EDGE_CASE_TIME_FIELD]: string;
  category?: string;
  tags?: string[];
  long_label: string;
  value: number | null;
  signed: number;
  huge: number;
  tiny: number;
  always_null: null;
}

const HOUR_MS = 60 * 60 * 1000;
const DOCUMENT_COUNT = 7 * 24;

/**
 * Builds the edge-case documents, one per hour across `EDGE_CASE_TIME_RANGE`, as a pure function of
 * the document index so every run indexes the same data.
 *
 * - `value` is `null` on every 7th document; `always_null` is always `null`.
 * - `signed` crosses zero, so per-bucket sums and averages are both negative and positive.
 * - `huge` spans 1e15–1e19 and `tiny` 1e-9–5e-9, for compact and scientific formats.
 * - `category` is missing on every 11th document (the missing bucket) and has 12 values (Other).
 * - `tags` holds zero to three values (multivalue).
 */
export const buildEdgeCaseDocuments = (): EdgeCaseDocument[] => {
  const start = Date.parse(EDGE_CASE_TIME_RANGE.from);

  return Array.from({ length: DOCUMENT_COUNT }, (_, index) => {
    // Skewed category frequencies keep the top terms stable and push the tail into Other.
    const spread = ((index * 37) % DOCUMENT_COUNT) / DOCUMENT_COUNT;
    const categoryIndex = Math.floor(EDGE_CASE_CATEGORIES.length * spread ** 2);
    const tagCount = index % 4;
    const tags = Array.from(
      { length: tagCount },
      (__, tagIndex) => EDGE_CASE_TAGS[(index + tagIndex * 2) % EDGE_CASE_TAGS.length]
    );

    return {
      [EDGE_CASE_TIME_FIELD]: new Date(start + index * HOUR_MS).toISOString(),
      ...(index % 11 === 0 ? {} : { category: EDGE_CASE_CATEGORIES[categoryIndex] }),
      ...(tagCount === 0 ? {} : { tags }),
      long_label: EDGE_CASE_LONG_LABELS[index % EDGE_CASE_LONG_LABELS.length],
      value: index % 7 === 0 ? null : (index % 23) * 1.5,
      signed: Math.round(Math.sin(index / 5) * 1000) / 10 - 20,
      huge: (1 + (index % 9)) * 10 ** (15 + (index % 4)),
      tiny: (1 + (index % 5)) * 1e-9,
      always_null: null,
    };
  });
};
