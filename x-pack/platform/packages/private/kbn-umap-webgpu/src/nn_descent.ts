/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Nearest neighbor descent for approximate KNN graph construction.
 *
 * Ported from umap-js.
 * Original: Copyright 2019 Google LLC (Apache-2.0)
 * UMAP algorithm: Copyright 2017 Leland McInnes (BSD-3-Clause)
 */

import * as heap from './heap';
import * as matrix from './matrix';
import * as tree from './tree';
import * as utils from './utils';
import type { RandomFn, Vectors, DistanceFn } from './types';

/** Create a nearest neighbor descent function with the given distance metric. */
export function makeNNDescent(distanceFn: DistanceFn, random: RandomFn) {
  return function nNDescent(
    data: Vectors,
    leafArray: Vectors,
    nNeighbors: number,
    nIters = 10,
    maxCandidates = 50,
    delta = 0.001,
    rho = 0.5,
    rpTreeInit = true
  ) {
    const nVertices = data.length;
    const currentGraph = heap.makeHeap(data.length, nNeighbors);

    for (let i = 0; i < data.length; i++) {
      const indices = heap.rejectionSample(nNeighbors, data.length, random);
      for (let j = 0; j < indices.length; j++) {
        const d = distanceFn(data[i], data[indices[j]]);
        heap.heapPush(currentGraph, i, d, indices[j], 1);
        heap.heapPush(currentGraph, indices[j], d, i, 1);
      }
    }

    if (rpTreeInit) {
      for (let n = 0; n < leafArray.length; n++) {
        for (let i = 0; i < leafArray[n].length; i++) {
          if (leafArray[n][i] < 0) break;
          for (let j = i + 1; j < leafArray[n].length; j++) {
            if (leafArray[n][j] < 0) break;
            const d = distanceFn(data[leafArray[n][i]], data[leafArray[n][j]]);
            heap.heapPush(currentGraph, leafArray[n][i], d, leafArray[n][j], 1);
            heap.heapPush(currentGraph, leafArray[n][j], d, leafArray[n][i], 1);
          }
        }
      }
    }

    for (let n = 0; n < nIters; n++) {
      const candidateNeighbors = heap.buildCandidates(
        currentGraph,
        nVertices,
        nNeighbors,
        maxCandidates,
        random
      );

      let c = 0;
      for (let i = 0; i < nVertices; i++) {
        for (let j = 0; j < maxCandidates; j++) {
          const p = Math.floor(candidateNeighbors[0][i][j]);
          if (p < 0 || utils.tauRand(random) < rho) continue;
          for (let k = 0; k < maxCandidates; k++) {
            const q = Math.floor(candidateNeighbors[0][i][k]);
            const cj = candidateNeighbors[2][i][j];
            const ck = candidateNeighbors[2][i][k];
            if (q < 0 || (!cj && !ck)) continue;

            const d = distanceFn(data[p], data[q]);
            c += heap.heapPush(currentGraph, p, d, q, 1);
            c += heap.heapPush(currentGraph, q, d, p, 1);
          }
        }
      }
      if (c <= delta * nNeighbors * data.length) break;
    }

    return heap.deheapSort(currentGraph);
  };
}

export type InitFromRandomFn = (
  nNeighbors: number,
  data: Vectors,
  queryPoints: Vectors,
  _heap: heap.Heap,
  random: RandomFn
) => void;

export type InitFromTreeFn = (
  _tree: tree.FlatTree,
  data: Vectors,
  queryPoints: Vectors,
  _heap: heap.Heap,
  random: RandomFn
) => void;

export function makeInitializations(distanceFn: DistanceFn) {
  function initFromRandom(
    nNeighbors: number,
    data: Vectors,
    queryPoints: Vectors,
    _heap: heap.Heap,
    random: RandomFn
  ) {
    for (let i = 0; i < queryPoints.length; i++) {
      const indices = utils.rejectionSample(nNeighbors, data.length, random);
      for (let j = 0; j < indices.length; j++) {
        if (indices[j] < 0) continue;
        const d = distanceFn(data[indices[j]], queryPoints[i]);
        heap.heapPush(_heap, i, d, indices[j], 1);
      }
    }
  }

  function initFromTree(
    _tree: tree.FlatTree,
    data: Vectors,
    queryPoints: Vectors,
    _heap: heap.Heap,
    random: RandomFn
  ) {
    for (let i = 0; i < queryPoints.length; i++) {
      const indices = tree.searchFlatTree(queryPoints[i], _tree, random);
      for (let j = 0; j < indices.length; j++) {
        if (indices[j] < 0) return;
        const d = distanceFn(data[indices[j]], queryPoints[i]);
        heap.heapPush(_heap, i, d, indices[j], 1);
      }
    }
  }

  return { initFromRandom, initFromTree };
}

export type SearchFn = (
  data: Vectors,
  graph: matrix.SparseMatrix,
  initialization: heap.Heap,
  queryPoints: Vectors
) => heap.Heap;

export function makeInitializedNNSearch(distanceFn: DistanceFn) {
  return function nnSearchFn(
    data: Vectors,
    graph: matrix.SparseMatrix,
    initialization: heap.Heap,
    queryPoints: Vectors
  ) {
    const { indices, indptr } = matrix.getCSR(graph);

    for (let i = 0; i < queryPoints.length; i++) {
      const tried = new Set(initialization[0][i]);
      while (true) {
        const vertex = heap.smallestFlagged(initialization, i);
        if (vertex === -1) break;
        const candidates = indices.slice(indptr[vertex], indptr[vertex + 1]);
        for (const candidate of candidates) {
          if (candidate === vertex || candidate === -1 || tried.has(candidate)) continue;
          const d = distanceFn(data[candidate], queryPoints[i]);
          heap.uncheckedHeapPush(initialization, i, d, candidate, 1);
          tried.add(candidate);
        }
      }
    }
    return initialization;
  };
}

export function initializeSearch(
  forest: tree.FlatTree[],
  data: Vectors,
  queryPoints: Vectors,
  nNeighbors: number,
  initFromRandom: InitFromRandomFn,
  initFromTree: InitFromTreeFn,
  random: RandomFn
): heap.Heap {
  const results = heap.makeHeap(queryPoints.length, nNeighbors);
  initFromRandom(nNeighbors, data, queryPoints, results, random);
  if (forest) {
    for (const t of forest) {
      initFromTree(t, data, queryPoints, results, random);
    }
  }
  return results;
}
