/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TextTiling algorithm (Hearst 1997) for topic-based text segmentation.
 *
 * 1. Tokenize text into pseudo-sentences (groups of words by window size)
 * 2. Compute block similarity at each gap using word frequency vectors
 * 3. Compute depth scores (how much similarity drops at each gap)
 * 4. Mark boundaries where depth exceeds threshold * max_depth
 * 5. Split text at those boundaries
 */

export interface TextTilingConfig {
  windowSize: number;
  smoothingWidth: number;
  threshold: number;
}

const DEFAULT_CONFIG: TextTilingConfig = {
  windowSize: 20,
  smoothingWidth: 2,
  threshold: 0.1,
};

/**
 * Segment text using the TextTiling algorithm.
 * Returns an array of text segments split at topic boundaries.
 */
export const segmentWithTextTiling = (
  text: string,
  config: Partial<TextTilingConfig> = {}
): string[] => {
  const { windowSize, smoothingWidth, threshold } = { ...DEFAULT_CONFIG, ...config };

  const sentences = splitIntoSentences(text);
  if (sentences.length <= 2) {
    return [text];
  }

  // Build pseudo-sentences (token blocks of windowSize words)
  const tokenBlocks = buildTokenBlocks(sentences, windowSize);
  if (tokenBlocks.length <= 2) {
    return [text];
  }

  // Compute block similarity at each gap
  const gapScores = computeGapScores(tokenBlocks);

  // Smooth the scores
  const smoothed = smooth(gapScores, smoothingWidth);

  // Compute depth scores
  const depthScores = computeDepthScores(smoothed);

  // Find boundaries where depth exceeds threshold
  const maxDepth = Math.max(...depthScores, 0);
  const cutoff = threshold * maxDepth;

  const boundaryIndices: number[] = [];
  for (let i = 0; i < depthScores.length; i++) {
    if (depthScores[i] > cutoff) {
      boundaryIndices.push(i);
    }
  }

  if (boundaryIndices.length === 0) {
    return [text];
  }

  // Map gap indices back to sentence indices and split
  return splitAtBoundaries(sentences, boundaryIndices, tokenBlocks.length);
};

const splitIntoSentences = (text: string): string[] => {
  return text
    .split(/(?<=[.!?])\s+|(?<=\n)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

/**
 * Group sentences into token blocks of approximately windowSize words each.
 * Returns array of word-frequency maps (one per block).
 */
const buildTokenBlocks = (
  sentences: string[],
  windowSize: number
): Map<string, number>[] => {
  const blocks: Map<string, number>[] = [];
  let currentBlock = new Map<string, number>();
  let wordCount = 0;

  for (const sentence of sentences) {
    const words = tokenize(sentence);
    for (const word of words) {
      currentBlock.set(word, (currentBlock.get(word) ?? 0) + 1);
      wordCount++;
    }

    if (wordCount >= windowSize) {
      blocks.push(currentBlock);
      currentBlock = new Map();
      wordCount = 0;
    }
  }

  if (currentBlock.size > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
};

/**
 * Compute cosine similarity between adjacent block pairs.
 * Returns a score for each gap between blocks.
 */
const computeGapScores = (blocks: Map<string, number>[]): number[] => {
  const scores: number[] = [];

  for (let i = 0; i < blocks.length - 1; i++) {
    scores.push(cosineSimilarity(blocks[i], blocks[i + 1]));
  }

  return scores;
};

const cosineSimilarity = (a: Map<string, number>, b: Map<string, number>): number => {
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

const smooth = (scores: number[], width: number): number[] => {
  if (width <= 0 || scores.length <= 1) return scores;

  const result: number[] = [];
  for (let i = 0; i < scores.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - width); j <= Math.min(scores.length - 1, i + width); j++) {
      sum += scores[j];
      count++;
    }
    result.push(sum / count);
  }
  return result;
};

/**
 * Compute depth scores: how much each gap is a "valley" compared to
 * the nearest peaks on either side.
 */
const computeDepthScores = (scores: number[]): number[] => {
  const depths: number[] = [];

  for (let i = 0; i < scores.length; i++) {
    // Find nearest peak to the left
    let leftPeak = scores[i];
    for (let j = i - 1; j >= 0; j--) {
      if (scores[j] > leftPeak) {
        leftPeak = scores[j];
      }
      if (scores[j] < scores[j + 1]) break;
    }

    // Find nearest peak to the right
    let rightPeak = scores[i];
    for (let j = i + 1; j < scores.length; j++) {
      if (scores[j] > rightPeak) {
        rightPeak = scores[j];
      }
      if (scores[j] < scores[j - 1]) break;
    }

    depths.push((leftPeak - scores[i]) + (rightPeak - scores[i]));
  }

  return depths;
};

const splitAtBoundaries = (
  sentences: string[],
  boundaryIndices: number[],
  totalBlocks: number
): string[] => {
  // Map block boundary indices to approximate sentence indices
  const sentencesPerBlock = Math.ceil(sentences.length / totalBlocks);
  const sentenceBoundaries = boundaryIndices
    .map((bi) => Math.min((bi + 1) * sentencesPerBlock, sentences.length))
    .filter((si, idx, arr) => idx === 0 || si !== arr[idx - 1]);

  const segments: string[] = [];
  let start = 0;
  for (const boundary of sentenceBoundaries) {
    if (boundary > start) {
      segments.push(sentences.slice(start, boundary).join(' '));
      start = boundary;
    }
  }
  if (start < sentences.length) {
    segments.push(sentences.slice(start).join(' '));
  }

  return segments.filter((s) => s.trim().length > 0);
};

const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
};
