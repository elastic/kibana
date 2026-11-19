/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Clustering utilities for post-UMAP analysis.
 *
 * - `autoCluster`: DBSCAN with auto-estimated epsilon (GPU first, CPU fallback)
 * - `reassignNoise`: assign noise points to nearest cluster centroid
 * - `computeClusterNames`: c-TF-IDF cluster naming from multi-valued labels
 *
 * @packageDocumentation
 */

import { dbscanGPU, type DBSCANResult } from './gpu/gpu_dbscan';
import { isWebGPUAvailable } from './gpu/webgpu_context';

// ── Types ────────────────────────────────────────────────────────

export type { DBSCANResult } from './gpu/gpu_dbscan';

export interface ClusterNameOptions {
  /** Per-point descriptions for word-level TF-IDF (optional). */
  descriptions?: string[] | null;
  /** Per-point rank weights, e.g. pagerank (optional). */
  ranks?: Float64Array | null;
}

export interface ClusterNameResult {
  /** Human-readable name per cluster. */
  names: string[];
  /** Top 10 TF-IDF terms per cluster (useful for LLM refinement). */
  topTermsPerCluster: string[][];
}

// ── CPU DBSCAN ───────────────────────────────────────────────────

/**
 * Simple O(n²) DBSCAN implementation for CPU fallback.
 * Returns array of clusters, each being an array of point indices.
 * Points not assigned to any cluster are "noise".
 */
function cpuDBSCANRun(points: number[][], epsilon: number, minPts: number): number[][] {
  const n = points.length;
  const nDims = points[0]?.length ?? 0;
  const eps2 = epsilon * epsilon;

  const UNCLASSIFIED = -1;
  const NOISE = -2;
  const labels = new Int32Array(n).fill(UNCLASSIFIED);
  const clusters: number[][] = [];

  function regionQuery(idx: number): number[] {
    const neighbors: number[] = [];
    for (let j = 0; j < n; j++) {
      let d2 = 0;
      for (let d = 0; d < nDims; d++) {
        const diff = points[idx][d] - points[j][d];
        d2 += diff * diff;
      }
      if (d2 <= eps2) neighbors.push(j);
    }
    return neighbors;
  }

  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNCLASSIFIED) continue;

    const neighbors = regionQuery(i);

    if (neighbors.length < minPts) {
      labels[i] = NOISE;
      continue;
    }

    // Start new cluster
    const id = clusterId++;
    const cluster: number[] = [];
    clusters.push(cluster);

    labels[i] = id;
    cluster.push(i);

    // Expand cluster via BFS
    const queue = [...neighbors.filter((j) => j !== i)];
    const inQueue = new Uint8Array(n);
    for (const j of neighbors) inQueue[j] = 1;

    let qi = 0;
    while (qi < queue.length) {
      const j = queue[qi++];

      if (labels[j] === NOISE) {
        // Was noise → now border point
        labels[j] = id;
        cluster.push(j);
        continue;
      }

      if (labels[j] !== UNCLASSIFIED) continue;

      labels[j] = id;
      cluster.push(j);

      const jNeighbors = regionQuery(j);
      if (jNeighbors.length >= minPts) {
        for (const k of jNeighbors) {
          if (!inQueue[k]) {
            inQueue[k] = 1;
            queue.push(k);
          }
        }
      }
    }
  }

  return clusters;
}

// ── Auto-cluster ─────────────────────────────────────────────────

/**
 * Run DBSCAN on a UMAP embedding with auto-estimated epsilon.
 *
 * Tries the GPU compute-shader path first (`dbscanGPU`), falls back to
 * a simple CPU implementation when WebGPU is unavailable.
 *
 * Works on both 2D and 3D embeddings (flat `Float32Array` or `number[][]`).
 *
 * @param embedding - The UMAP embedding (flat Float32Array or array-of-arrays).
 * @param nComponents - Dimensionality of the embedding (2 or 3).
 * @param epsilonMultiplier - Scale factor for the auto-estimated epsilon. Default: 1.0.
 * @returns Cluster labels, count, and noise count.
 */
export async function autoCluster(
  embedding: Float32Array | number[][],
  nComponents: number,
  epsilonMultiplier = 1.0
): Promise<DBSCANResult> {
  // ── Try GPU DBSCAN first ──
  if (isWebGPUAvailable()) {
    try {
      return await dbscanGPU(embedding, nComponents, undefined, epsilonMultiplier);
    } catch {
      // GPU DBSCAN failed; fall through to the CPU implementation.
    }
  }

  // ── CPU fallback ──
  const isFlat = embedding instanceof Float32Array;
  const n = isFlat ? embedding.length / nComponents : (embedding as number[][]).length;

  // Convert to array-of-arrays for CPU DBSCAN
  const points = new Array(n);
  for (let i = 0; i < n; i++) {
    const pt = new Array(nComponents);
    for (let d = 0; d < nComponents; d++) {
      pt[d] = isFlat
        ? (embedding as Float32Array)[i * nComponents + d]
        : (embedding as number[][])[i][d];
    }
    points[i] = pt;
  }

  // Auto-estimate epsilon via k-NN distance sampling
  const minPts = Math.max(5, Math.min(15, Math.floor(n / 500)));
  const k = minPts;
  const sampleSize = Math.min(300, n);
  const sampleStep = Math.max(1, Math.floor(n / sampleSize));
  const kDists: number[] = [];

  for (let si = 0; si < n; si += sampleStep) {
    // Compute distances from sample point to all others
    const dists = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      let d2 = 0;
      for (let d = 0; d < nComponents; d++) {
        const diff = points[si][d] - points[j][d];
        d2 += diff * diff;
      }
      dists[j] = Math.sqrt(d2);
    }
    // Find k-th smallest (excluding self at distance 0)
    const sorted = Array.from(dists).sort((a, b) => a - b);
    kDists.push(sorted[k]); // index k = k-th neighbor (0 is self)
  }

  // Use 90th percentile of k-NN distances, scaled by multiplier
  kDists.sort((a, b) => a - b);
  const epsilon = kDists[Math.floor(kDists.length * 0.9)] * epsilonMultiplier;

  // Run DBSCAN
  const clusters = cpuDBSCANRun(points, epsilon, minPts);

  // Convert cluster arrays to per-point labels
  // Noise points get label = nClusters (one past the last cluster index)
  const nClusters = clusters.length;
  const labels = new Array(n).fill(nClusters); // default = noise
  for (let ci = 0; ci < nClusters; ci++) {
    for (const idx of clusters[ci]) {
      labels[idx] = ci;
    }
  }

  const noiseCount = labels.filter((l: number) => l === nClusters).length;

  return { labels, nClusters, noiseCount };
}

// ── Noise reassignment ───────────────────────────────────────────

/**
 * Reassign noise points to their nearest cluster centroid.
 *
 * Modifies `labels` in-place. Returns the updated noise count (0 after
 * reassignment when clusters exist).
 *
 * @param embedding - The UMAP embedding (flat Float32Array or array-of-arrays).
 * @param labels - Per-point cluster labels (noise points have label >= nClusters).
 * @param nClusters - Number of real clusters (noise label = nClusters).
 * @param nComponents - Dimensionality (2 or 3).
 * @returns Updated noise count (0 if all reassigned).
 */
export function reassignNoise(
  embedding: Float32Array | number[][],
  labels: number[],
  nClusters: number,
  nComponents: number
): number {
  const isFlat = embedding instanceof Float32Array;
  const n = isFlat
    ? (embedding as Float32Array).length / nComponents
    : (embedding as number[][]).length;

  // Compute cluster centroids
  const centroids = Array.from({ length: nClusters }, () => new Float64Array(nComponents));
  const counts = new Uint32Array(nClusters);

  for (let i = 0; i < n; i++) {
    const c = labels[i];
    if (c >= nClusters) continue; // skip noise
    counts[c]++;
    for (let d = 0; d < nComponents; d++) {
      centroids[c][d] += isFlat
        ? (embedding as Float32Array)[i * nComponents + d]
        : (embedding as number[][])[i][d];
    }
  }
  for (let c = 0; c < nClusters; c++) {
    if (counts[c] > 0) {
      for (let d = 0; d < nComponents; d++) centroids[c][d] /= counts[c];
    }
  }

  // Assign each noise point to nearest centroid
  for (let i = 0; i < n; i++) {
    if (labels[i] < nClusters) continue; // not noise
    let bestDist = Infinity;
    let bestCluster = 0;
    for (let c = 0; c < nClusters; c++) {
      let d2 = 0;
      for (let d = 0; d < nComponents; d++) {
        const v =
          (isFlat
            ? (embedding as Float32Array)[i * nComponents + d]
            : (embedding as number[][])[i][d]) - centroids[c][d];
        d2 += v * v;
      }
      if (d2 < bestDist) {
        bestDist = d2;
        bestCluster = c;
      }
    }
    labels[i] = bestCluster;
  }

  return 0; // no noise remaining
}

// ── c-TF-IDF cluster naming ──────────────────────────────────────

/** Common English stop words filtered from word-level TF-IDF. */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'it',
  'as',
  'be',
  'was',
  'are',
  'were',
  'been',
  'being',
  'has',
  'had',
  'have',
  'do',
  'does',
  'did',
  'will',
  'would',
  'shall',
  'should',
  'may',
  'might',
  'can',
  'could',
  'that',
  'which',
  'who',
  'whom',
  'this',
  'these',
  'those',
  'its',
  'not',
  'no',
  'nor',
  'so',
  'if',
  'then',
  'than',
  'too',
  'very',
  'also',
  'about',
  'above',
  'after',
  'before',
  'between',
  'into',
  'through',
  'during',
  'under',
  'over',
  'out',
  'up',
  'down',
  'off',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'only',
  'own',
  'same',
  'his',
  'her',
  'their',
  'our',
  'your',
  'he',
  'she',
  'they',
  'we',
  'you',
  'i',
  'me',
  'him',
  'us',
  'them',
  'my',
  'mine',
  'yours',
  'hers',
  'ours',
  'theirs',
  'what',
  'when',
  'where',
  'how',
  'why',
  'any',
  'many',
  'much',
  'de',
  'la',
  'le',
  'et',
  'des',
  'du',
  'en',
  'est',
  'les',
  'un',
  'une',
]);

/**
 * Compute class-based TF-IDF to generate human-readable cluster names.
 *
 * When `descriptions` are provided, word-level TF-IDF (unigrams + bigrams +
 * trigrams) is used. Otherwise, the raw multi-valued labels are used directly.
 *
 * @param clusterLabels - Per-point cluster assignment.
 * @param rawMultiLabels - Per-point array of string labels (e.g. tags, categories).
 * @param nClusters - Number of clusters.
 * @param options - Optional descriptions and rank weights.
 * @returns Cluster names and top terms per cluster.
 */
export function computeClusterNames(
  clusterLabels: number[],
  rawMultiLabels: string[][],
  nClusters: number,
  options: ClusterNameOptions = {}
): ClusterNameResult {
  const { descriptions = null, ranks = null } = options;
  const useWordTFIDF = !!descriptions;

  const clusterTermWeights: Record<string, number>[] = Array.from(
    { length: nClusters },
    () => ({})
  );
  const clusterTotalWeight = new Array(nClusters).fill(0);

  for (let i = 0; i < clusterLabels.length; i++) {
    const c = clusterLabels[i];
    if (c >= nClusters) continue; // skip noise

    // Weight: use rank if available, otherwise 1 per doc
    const weight = ranks && ranks[i] ? ranks[i] : 1;
    clusterTotalWeight[c] += weight;

    let terms: string[];
    if (useWordTFIDF) {
      // Tokenize description into lowercase words
      const allTokens = (descriptions![i] || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s'-]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 0);

      const isGoodWord = (w: string) => w.length > 2 && !STOP_WORDS.has(w);
      const unigrams = allTokens.filter(isGoodWord);

      // Generate bigrams + trigrams
      const ngrams: string[] = [];
      for (let j = 0; j < allTokens.length - 1; j++) {
        if (isGoodWord(allTokens[j]) && isGoodWord(allTokens[j + 1])) {
          ngrams.push(allTokens[j] + ' ' + allTokens[j + 1]);
        }
      }
      for (let j = 0; j < allTokens.length - 2; j++) {
        if (
          isGoodWord(allTokens[j]) &&
          isGoodWord(allTokens[j + 1]) &&
          isGoodWord(allTokens[j + 2])
        ) {
          ngrams.push(allTokens[j] + ' ' + allTokens[j + 1] + ' ' + allTokens[j + 2]);
        }
      }

      // Combine and deduplicate per document
      terms = [...new Set([...unigrams, ...ngrams])];
    } else {
      terms = rawMultiLabels[i] || [];
    }

    for (const t of terms) {
      clusterTermWeights[c][t] = (clusterTermWeights[c][t] || 0) + weight;
    }
  }

  const nTop = 1;
  const names: string[] = [];
  const topTermsPerCluster: string[][] = [];

  for (let c = 0; c < nClusters; c++) {
    const cWeight = clusterTotalWeight[c] || 1;
    const scores: Record<string, number> = {};

    for (const [t, tWeight] of Object.entries(clusterTermWeights[c])) {
      // Within-cluster frequency, boosted by n-gram length
      const nWords = t.split(' ').length;
      scores[t] = (tWeight / cWeight) * nWords;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    topTermsPerCluster.push(sorted.slice(0, 10).map(([t]) => t));

    const topTerms = sorted.slice(0, nTop).map(([t]) => {
      if (useWordTFIDF) {
        // Capitalize each word
        return t
          .split(' ')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
      return t
        .replace(/^Team:/, '')
        .replace(/^Feature:/, '')
        .replace(/^>/, '');
    });

    names.push(topTerms.join('\n') || `Cluster ${c}`);
  }

  return { names, topTermsPerCluster };
}
