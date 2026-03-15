/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '../../types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  for (const [term, count] of tf) {
    tf.set(term, count / tokens.length);
  }
  return tf;
}

function computeIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = documents.length;

  const allTerms = new Set(documents.flat());

  for (const term of allTerms) {
    const docsWithTerm = documents.filter((doc) => doc.includes(term)).length;
    idf.set(term, Math.log((totalDocs + 1) / (docsWithTerm + 1)) + 1);
  }

  return idf;
}

function computeTfIdfVector(
  tf: Map<string, number>,
  idf: Map<string, number>,
  vocabulary: string[]
): number[] {
  return vocabulary.map((term) => {
    const tfVal = tf.get(term) ?? 0;
    const idfVal = idf.get(term) ?? 0;
    return tfVal * idfVal;
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

export function createSimilarityEvaluator(config?: { threshold?: number }): Evaluator {
  const threshold = config?.threshold ?? 0.7;

  return {
    name: 'similarity',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      const expectedText = typeof expected === 'string' ? expected : JSON.stringify(expected ?? '');
      const outputText = typeof output === 'string' ? output : JSON.stringify(output ?? '');

      if (expectedText.trim().length === 0 && outputText.trim().length === 0) {
        return {
          score: 1.0,
          label: 'similar',
          explanation: 'Both expected and actual outputs are empty.',
        };
      }

      if (expectedText.trim().length === 0 || outputText.trim().length === 0) {
        return {
          score: 0.0,
          label: 'dissimilar',
          explanation: 'One of the outputs is empty while the other is not.',
        };
      }

      const expectedTokens = tokenize(expectedText);
      const outputTokens = tokenize(outputText);

      if (expectedTokens.length === 0 && outputTokens.length === 0) {
        return {
          score: 1.0,
          label: 'similar',
          explanation: 'Both texts tokenize to empty after normalization.',
        };
      }

      const documents = [expectedTokens, outputTokens];
      const idf = computeIDF(documents);
      const vocabulary = Array.from(idf.keys());

      const expectedTf = computeTermFrequency(expectedTokens);
      const outputTf = computeTermFrequency(outputTokens);

      const expectedVector = computeTfIdfVector(expectedTf, idf, vocabulary);
      const outputVector = computeTfIdfVector(outputTf, idf, vocabulary);

      const score = cosineSimilarity(expectedVector, outputVector);

      const expectedSet = new Set(expectedTokens);
      const outputSet = new Set(outputTokens);

      const matchingTerms = [...expectedSet].filter((t) => outputSet.has(t));
      const missingTerms = [...expectedSet].filter((t) => !outputSet.has(t));

      return {
        score,
        label: score >= threshold ? 'similar' : 'dissimilar',
        explanation: [
          `Cosine similarity: ${score.toFixed(3)}`,
          `Threshold: ${threshold}`,
          `Matching terms (${matchingTerms.length}): ${matchingTerms.slice(0, 10).join(', ')}${matchingTerms.length > 10 ? '...' : ''}`,
          `Missing terms (${missingTerms.length}): ${missingTerms.slice(0, 10).join(', ')}${missingTerms.length > 10 ? '...' : ''}`,
        ].join('. '),
        metadata: {
          similarity: score,
          threshold,
          matchingTermCount: matchingTerms.length,
          missingTermCount: missingTerms.length,
        },
      };
    },
  };
}
