/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UMAP, findABParams } from './umap';
import { euclidean, cosine } from './distances';

// Deterministic PRNG (Park–Miller) for reproducible tests
function makeRandom(seed = 42) {
  const modulus = 2147483647;
  let state = (Math.abs(Math.round(seed)) % (modulus - 1)) + 1;
  return () => {
    state = (state * 48271) % modulus;
    return (state - 1) / (modulus - 1);
  };
}

// Generate simple clustered test data
function generateClusters(
  nPerCluster: number,
  nClusters: number,
  dims: number,
  random: () => number
): { data: number[][]; labels: number[] } {
  const data: number[][] = [];
  const labels: number[] = [];
  const centers: number[][] = [];

  for (let c = 0; c < nClusters; c++) {
    centers.push(Array.from({ length: dims }, () => (random() - 0.5) * 20));
  }

  for (let c = 0; c < nClusters; c++) {
    for (let i = 0; i < nPerCluster; i++) {
      data.push(centers[c].map((v) => v + (random() - 0.5) * 2));
      labels.push(c);
    }
  }
  return { data, labels };
}

describe('distance functions', () => {
  it('euclidean distance is zero for identical vectors', () => {
    expect(euclidean([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('euclidean distance is correct', () => {
    expect(euclidean([0, 0], [3, 4])).toBe(5);
  });

  it('cosine distance is zero for identical vectors', () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 10);
  });

  it('cosine distance is 1 for orthogonal vectors', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(1, 10);
  });

  it('cosine handles zero vectors', () => {
    expect(cosine([0, 0], [0, 0])).toBe(0);
    expect(cosine([0, 0], [1, 1])).toBe(1);
  });
});

describe('findABParams', () => {
  it('returns reasonable a, b values for default params', () => {
    const { a, b } = findABParams(1.0, 0.1);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(0);
    expect(a).toBeLessThan(10);
    expect(b).toBeLessThan(5);
  });
});

describe('UMAP', () => {
  it('creates an instance with default params', () => {
    const umap = new UMAP();
    expect(umap).toBeDefined();
  });

  it('fit produces 2D embedding', () => {
    const random = makeRandom(1);
    const { data } = generateClusters(10, 3, 5, random);

    const umap = new UMAP({
      nNeighbors: 5,
      nComponents: 2,
      nEpochs: 50,
      random: makeRandom(2),
    });

    const embedding = umap.fit(data);

    expect(embedding.length).toBe(data.length);
    expect(embedding[0].length).toBe(2);

    // Check all values are finite
    for (const point of embedding) {
      for (const val of point) {
        expect(isFinite(val)).toBe(true);
      }
    }
  });

  it('fit produces 3D embedding when nComponents=3', () => {
    const random = makeRandom(3);
    const { data } = generateClusters(10, 2, 5, random);

    const umap = new UMAP({
      nNeighbors: 5,
      nComponents: 3,
      nEpochs: 30,
      random: makeRandom(4),
    });

    const embedding = umap.fit(data);
    expect(embedding[0].length).toBe(3);
  });

  it('clusters are separated in embedding', () => {
    const random = makeRandom(10);
    const { data, labels } = generateClusters(20, 3, 10, random);

    const umap = new UMAP({
      nNeighbors: 10,
      nEpochs: 200,
      random: makeRandom(11),
    });

    const embedding = umap.fit(data);

    // Compute mean position per cluster
    const clusterMeans: Record<number, [number, number]> = {};
    const clusterCounts: Record<number, number> = {};
    for (let i = 0; i < embedding.length; i++) {
      const label = labels[i];
      if (!clusterMeans[label]) {
        clusterMeans[label] = [0, 0];
        clusterCounts[label] = 0;
      }
      clusterMeans[label][0] += embedding[i][0];
      clusterMeans[label][1] += embedding[i][1];
      clusterCounts[label]++;
    }

    for (const label of Object.keys(clusterMeans)) {
      const n = clusterCounts[Number(label)];
      clusterMeans[Number(label)][0] /= n;
      clusterMeans[Number(label)][1] /= n;
    }

    // Cluster centers should be distinct (at least some distance apart)
    const uniqueLabels = Object.keys(clusterMeans).map(Number);
    for (let i = 0; i < uniqueLabels.length; i++) {
      for (let j = i + 1; j < uniqueLabels.length; j++) {
        const dx = clusterMeans[uniqueLabels[i]][0] - clusterMeans[uniqueLabels[j]][0];
        const dy = clusterMeans[uniqueLabels[i]][1] - clusterMeans[uniqueLabels[j]][1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThan(0.1);
      }
    }
  });

  it('step() advances epochs', () => {
    const random = makeRandom(20);
    const { data } = generateClusters(10, 2, 5, random);

    const umap = new UMAP({
      nNeighbors: 5,
      nEpochs: 10,
      random: makeRandom(21),
    });

    umap.initializeFit(data);

    const epoch1 = umap.step();
    expect(epoch1).toBe(1);

    const epoch2 = umap.step();
    expect(epoch2).toBe(2);
  });

  it('getEmbedding returns current state', () => {
    const random = makeRandom(30);
    const { data } = generateClusters(10, 2, 5, random);

    const umap = new UMAP({
      nNeighbors: 5,
      nEpochs: 5,
      random: makeRandom(31),
    });

    umap.initializeFit(data);
    const emb = umap.getEmbedding();
    expect(emb.length).toBe(data.length);
  });

  it('fitAsync completes', async () => {
    const random = makeRandom(40);
    const { data } = generateClusters(10, 2, 5, random);

    const umap = new UMAP({
      nNeighbors: 5,
      nEpochs: 20,
      random: makeRandom(41),
    });

    const embedding = await umap.fitAsync(data);
    expect(embedding.length).toBe(data.length);
    expect(embedding[0].length).toBe(2);
  });

  it('throws when not enough data points', () => {
    const umap = new UMAP({ nNeighbors: 15 });
    expect(() =>
      umap.fit([
        [1, 2],
        [3, 4],
      ])
    ).toThrow();
  });

  it('setPrecomputedKNN works', () => {
    const random = makeRandom(50);
    const { data } = generateClusters(10, 2, 5, random);

    const umap = new UMAP({
      nNeighbors: 3,
      nEpochs: 10,
      random: makeRandom(51),
    });

    // Create simple fake KNN (each point's neighbors are next few points)
    const knnIndices: number[][] = [];
    const knnDistances: number[][] = [];
    for (let i = 0; i < data.length; i++) {
      const indices = [];
      const distances = [];
      for (let j = 0; j < 3; j++) {
        indices.push((i + j) % data.length);
        distances.push(j * 0.5);
      }
      knnIndices.push(indices);
      knnDistances.push(distances);
    }

    umap.setPrecomputedKNN(knnIndices, knnDistances);
    const embedding = umap.fit(data);
    expect(embedding.length).toBe(data.length);
  });
});
