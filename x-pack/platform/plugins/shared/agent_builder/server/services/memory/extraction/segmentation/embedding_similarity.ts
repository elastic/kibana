/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Embedding-similarity text segmentation WITHOUT LLMs.
 *
 * Uses TF-IDF weighted word-overlap cosine similarity as a proxy for
 * semantic similarity between sentence windows. Segments are created
 * where consecutive windows drop below the similarity threshold.
 *
 * Algorithm:
 * 1. Split text into sentences
 * 2. Build sentence windows (groups of N sentences)
 * 3. Compute TF-IDF vectors for each window
 * 4. Compute cosine similarity between consecutive windows
 * 5. Split where similarity drops below threshold
 */

export interface EmbeddingSimilarityConfig {
  sentenceWindowSize: number;
  similarityThreshold: number;
  similarity?: 'tfidf' | 'inference';
}

/**
 * Function that computes an embedding vector for a text string.
 * Used when similarity='inference' to call the ES inference API.
 */
export type EmbedFn = (text: string) => Promise<number[]>;

const DEFAULT_CONFIG: EmbeddingSimilarityConfig = {
  sentenceWindowSize: 3,
  similarityThreshold: 0.3,
  similarity: 'tfidf',
};

/**
 * Segment text using embedding-similarity.
 *
 * When similarity='tfidf' (default): uses TF-IDF weighted word-overlap cosine (no external calls).
 * When similarity='inference': uses real embeddings from the ES inference API via the provided embedFn.
 *
 * Returns an array of text segments split at similarity drop-off points.
 */
export const segmentWithEmbeddingSimilarity = async (
  text: string,
  config: Partial<EmbeddingSimilarityConfig> = {},
  embedFn?: EmbedFn
): Promise<string[]> => {
  const { sentenceWindowSize, similarityThreshold, similarity } = { ...DEFAULT_CONFIG, ...config };

  const sentences = splitIntoSentences(text);
  if (sentences.length <= sentenceWindowSize) {
    return [text];
  }

  const windows = buildWindows(sentences, sentenceWindowSize);
  if (windows.length <= 1) {
    return [text];
  }

  let similarities: number[];

  if (similarity === 'inference' && embedFn) {
    similarities = await computeInferenceSimilarities(windows, embedFn);
  } else {
    similarities = computeTfidfSimilarities(windows);
  }

  const boundaries: number[] = [];
  for (let i = 0; i < similarities.length; i++) {
    if (similarities[i] < similarityThreshold) {
      boundaries.push(i);
    }
  }

  if (boundaries.length === 0) {
    return [text];
  }

  return splitAtBoundaries(sentences, boundaries, sentenceWindowSize);
};

/**
 * Compute pairwise similarities between consecutive windows using TF-IDF cosine.
 */
const computeTfidfSimilarities = (windows: string[]): number[] => {
  const df = computeDocumentFrequency(windows);
  const numDocs = windows.length;
  const tfidfVectors = windows.map((window) => computeTfIdf(window, df, numDocs));

  const similarities: number[] = [];
  for (let i = 0; i < tfidfVectors.length - 1; i++) {
    similarities.push(cosineSimilarityMap(tfidfVectors[i], tfidfVectors[i + 1]));
  }
  return similarities;
};

/**
 * Compute pairwise similarities between consecutive windows using real embeddings.
 * Calls embedFn for each window to get dense vectors, then computes cosine similarity.
 */
const computeInferenceSimilarities = async (
  windows: string[],
  embedFn: EmbedFn
): Promise<number[]> => {
  const embeddings = await Promise.all(windows.map((w) => embedFn(w)));

  const similarities: number[] = [];
  for (let i = 0; i < embeddings.length - 1; i++) {
    similarities.push(cosineSimilarityVec(embeddings[i], embeddings[i + 1]));
  }
  return similarities;
};

const splitIntoSentences = (text: string): string[] => {
  return text
    .split(/(?<=[.!?])\s+|(?<=\n)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

/**
 * Build overlapping windows of sentences.
 * Each window is the concatenation of sentenceWindowSize consecutive sentences.
 */
const buildWindows = (sentences: string[], windowSize: number): string[] => {
  const windows: string[] = [];
  for (let i = 0; i <= sentences.length - windowSize; i++) {
    windows.push(sentences.slice(i, i + windowSize).join(' '));
  }
  return windows;
};

const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
};

/**
 * Compute document frequency: how many windows each word appears in.
 */
const computeDocumentFrequency = (windows: string[]): Map<string, number> => {
  const df = new Map<string, number>();
  for (const window of windows) {
    const uniqueTokens = new Set(tokenize(window));
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  return df;
};

/**
 * Compute TF-IDF vector for a single window.
 */
const computeTfIdf = (
  window: string,
  df: Map<string, number>,
  numDocs: number
): Map<string, number> => {
  const tokens = tokenize(window);
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }

  const tfidf = new Map<string, number>();
  for (const [token, count] of tf.entries()) {
    const docFreq = df.get(token) ?? 1;
    const idf = Math.log((numDocs + 1) / (docFreq + 1)) + 1;
    tfidf.set(token, (count / tokens.length) * idf);
  }

  return tfidf;
};

/**
 * Cosine similarity between two dense embedding vectors.
 */
const cosineSimilarityVec = (a: number[], b: number[]): number => {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dotProduct / denom : 0;
};

const cosineSimilarityMap = (a: Map<string, number>, b: Map<string, number>): number => {
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const key of allKeys) {
    const va = a.get(key) ?? 0;
    const vb = b.get(key) ?? 0;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dotProduct / denom : 0;
};

const splitAtBoundaries = (
  sentences: string[],
  boundaries: number[],
  windowSize: number
): string[] => {
  // Each boundary index i means: split between window[i] and window[i+1].
  // Window[i] starts at sentence[i], so the split point is at sentence[i + windowSize].
  const sentenceSplitPoints = boundaries
    .map((bi) => bi + windowSize)
    .filter((sp) => sp > 0 && sp < sentences.length);

  // Deduplicate and sort
  const uniqueSplits = [...new Set(sentenceSplitPoints)].sort((a, b) => a - b);

  const segments: string[] = [];
  let start = 0;
  for (const split of uniqueSplits) {
    if (split > start) {
      segments.push(sentences.slice(start, split).join(' '));
      start = split;
    }
  }
  if (start < sentences.length) {
    segments.push(sentences.slice(start).join(' '));
  }

  return segments.filter((s) => s.trim().length > 0);
};

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
  'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which',
  'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
  'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good',
  'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now',
  'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
  'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
  'day', 'most', 'was', 'were', 'been', 'has', 'had', 'are', 'is',
]);
