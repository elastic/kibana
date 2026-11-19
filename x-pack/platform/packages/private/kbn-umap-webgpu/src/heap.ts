/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Heap data structure for nearest neighbor search.
 *
 * Ported from umap-js.
 * Original: Copyright 2019 Google LLC (Apache-2.0)
 * UMAP algorithm: Copyright 2017 Leland McInnes (BSD-3-Clause)
 */

import type { RandomFn } from './types';
import * as utils from './utils';

export type Heap = number[][][];

/**
 * Construct a heap for approximate nearest neighbor search.
 * Shape: [3][nPoints][size] — indices, distances, isNew flags.
 */
export function makeHeap(nPoints: number, size: number): Heap {
  const makeArrays = (fillValue: number) =>
    utils.empty(nPoints).map(() => utils.filled(size, fillValue));

  return [makeArrays(-1), makeArrays(Infinity), makeArrays(0)];
}

/** Rejection sample nSamples unique integers from [0, poolSize). */
export function rejectionSample(nSamples: number, poolSize: number, random: RandomFn): number[] {
  const result = utils.zeros(nSamples);
  for (let i = 0; i < nSamples; i++) {
    let rejectSample = true;
    let j = 0;
    while (rejectSample) {
      j = utils.tauRandInt(poolSize, random);
      let broken = false;
      for (let k = 0; k < i; k++) {
        if (j === result[k]) {
          broken = true;
          break;
        }
      }
      if (!broken) rejectSample = false;
    }
    result[i] = j;
  }
  return result;
}

/**
 * Push a new element onto the heap (with duplicate check).
 * Returns 1 if pushed, 0 otherwise.
 */
export function heapPush(
  heap: Heap,
  row: number,
  weight: number,
  index: number,
  flag: number
): number {
  row = Math.floor(row);
  const indices = heap[0][row];
  const weights = heap[1][row];

  if (weight >= weights[0]) return 0;

  for (let i = 0; i < indices.length; i++) {
    if (index === indices[i]) return 0;
  }

  return uncheckedHeapPush(heap, row, weight, index, flag);
}

/**
 * Push a new element onto the heap (without duplicate check).
 * Returns 1 if pushed, 0 otherwise.
 */
export function uncheckedHeapPush(
  heap: Heap,
  row: number,
  weight: number,
  index: number,
  flag: number
): number {
  const indices = heap[0][row];
  const weights = heap[1][row];
  const isNew = heap[2][row];

  if (weight >= weights[0]) return 0;

  weights[0] = weight;
  indices[0] = index;
  isNew[0] = flag;

  let i = 0;
  let iSwap = 0;
  while (true) {
    const ic1 = 2 * i + 1;
    const ic2 = ic1 + 1;
    const heapShape2 = heap[0][0].length;

    if (ic1 >= heapShape2) {
      break;
    } else if (ic2 >= heapShape2) {
      if (weights[ic1] > weight) {
        iSwap = ic1;
      } else {
        break;
      }
    } else if (weights[ic1] >= weights[ic2]) {
      if (weight < weights[ic1]) {
        iSwap = ic1;
      } else {
        break;
      }
    } else {
      if (weight < weights[ic2]) {
        iSwap = ic2;
      } else {
        break;
      }
    }

    weights[i] = weights[iSwap];
    indices[i] = indices[iSwap];
    isNew[i] = isNew[iSwap];
    i = iSwap;
  }

  weights[i] = weight;
  indices[i] = index;
  isNew[i] = flag;
  return 1;
}

/** Build candidate neighbors for NN-descent iteration. */
export function buildCandidates(
  currentGraph: Heap,
  nVertices: number,
  nNeighbors: number,
  maxCandidates: number,
  random: RandomFn
): Heap {
  const candidateNeighbors = makeHeap(nVertices, maxCandidates);
  for (let i = 0; i < nVertices; i++) {
    for (let j = 0; j < nNeighbors; j++) {
      if (currentGraph[0][i][j] < 0) continue;
      const idx = currentGraph[0][i][j];
      const isn = currentGraph[2][i][j];
      const d = utils.tauRand(random);
      heapPush(candidateNeighbors, i, d, idx, isn);
      heapPush(candidateNeighbors, idx, d, i, isn);
      currentGraph[2][i][j] = 0;
    }
  }
  return candidateNeighbors;
}

/** Sort the heap and return sorted indices and weights. */
export function deheapSort(heap: Heap): {
  indices: number[][];
  weights: number[][];
} {
  const indices = heap[0];
  const weights = heap[1];

  for (let i = 0; i < indices.length; i++) {
    const indHeap = indices[i];
    const distHeap = weights[i];

    for (let j = 0; j < indHeap.length - 1; j++) {
      const indHeapIndex = indHeap.length - j - 1;
      const distHeapIndex = distHeap.length - j - 1;

      const temp1 = indHeap[0];
      indHeap[0] = indHeap[indHeapIndex];
      indHeap[indHeapIndex] = temp1;

      const temp2 = distHeap[0];
      distHeap[0] = distHeap[distHeapIndex];
      distHeap[distHeapIndex] = temp2;

      siftDown(distHeap, indHeap, distHeapIndex, 0);
    }
  }
  return { indices, weights };
}

function siftDown(heap1: number[], heap2: number[], ceiling: number, elt: number): void {
  while (elt * 2 + 1 < ceiling) {
    const leftChild = elt * 2 + 1;
    const rightChild = leftChild + 1;
    let swap = elt;

    if (heap1[swap] < heap1[leftChild]) swap = leftChild;
    if (rightChild < ceiling && heap1[swap] < heap1[rightChild]) swap = rightChild;

    if (swap === elt) {
      break;
    } else {
      const temp1 = heap1[elt];
      heap1[elt] = heap1[swap];
      heap1[swap] = temp1;

      const temp2 = heap2[elt];
      heap2[elt] = heap2[swap];
      heap2[swap] = temp2;
      elt = swap;
    }
  }
}

/** Find the smallest flagged element in a heap row. */
export function smallestFlagged(heap: Heap, row: number): number {
  const ind = heap[0][row];
  const dist = heap[1][row];
  const flag = heap[2][row];

  let minDist = Infinity;
  let resultIndex = -1;

  for (let i = 0; i < ind.length; i++) {
    if (flag[i] === 1 && dist[i] < minDist) {
      minDist = dist[i];
      resultIndex = i;
    }
  }

  if (resultIndex >= 0) {
    flag[resultIndex] = 0;
    return Math.floor(ind[resultIndex]);
  }
  return -1;
}
