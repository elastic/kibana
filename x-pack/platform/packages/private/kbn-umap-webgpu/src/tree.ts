/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Random projection tree for approximate nearest neighbor search.
 *
 * Ported from umap-js.
 * Original: Copyright 2019 Google LLC (Apache-2.0)
 * UMAP algorithm: Copyright 2017 Leland McInnes (BSD-3-Clause)
 */

import type { RandomFn, Vector, Vectors } from './types';
import * as utils from './utils';

interface RandomProjectionTreeNode {
  isLeaf: boolean;
  indices?: number[];
  leftChild?: RandomProjectionTreeNode;
  rightChild?: RandomProjectionTreeNode;
  hyperplane?: number[];
  offset?: number;
}

export class FlatTree {
  constructor(
    public hyperplanes: number[][],
    public offsets: number[],
    public children: number[][],
    public indices: number[][]
  ) {}
}

/** Build a random projection forest with nTrees trees. */
export function makeForest(
  data: Vectors,
  nNeighbors: number,
  nTrees: number,
  random: RandomFn
): FlatTree[] {
  const leafSize = Math.max(10, nNeighbors);
  const trees = utils.range(nTrees).map((_, i) => makeTree(data, leafSize, i, random));
  return trees.map((t) => flattenTree(t, leafSize));
}

function makeTree(
  data: Vectors,
  leafSize: number,
  n: number,
  random: RandomFn
): RandomProjectionTreeNode {
  const indices = utils.range(data.length);
  return makeEuclideanTree(data, indices, leafSize, n, random);
}

function makeEuclideanTree(
  data: Vectors,
  indices: number[],
  leafSize: number,
  q: number,
  random: RandomFn
): RandomProjectionTreeNode {
  if (indices.length > leafSize) {
    const { indicesLeft, indicesRight, hyperplane, offset } = euclideanRandomProjectionSplit(
      data,
      indices,
      random
    );

    const leftChild = makeEuclideanTree(data, indicesLeft, leafSize, q + 1, random);
    const rightChild = makeEuclideanTree(data, indicesRight, leafSize, q + 1, random);
    return { leftChild, rightChild, isLeaf: false, hyperplane, offset };
  }
  return { indices, isLeaf: true };
}

function euclideanRandomProjectionSplit(data: Vectors, indices: number[], random: RandomFn) {
  const dim = data[0].length;

  const leftIndex = utils.tauRandInt(indices.length, random);
  let rightIndex = utils.tauRandInt(indices.length, random);
  rightIndex += leftIndex === rightIndex ? 1 : 0;
  rightIndex = rightIndex % indices.length;
  const left = indices[leftIndex];
  const right = indices[rightIndex];

  let hyperplaneOffset = 0;
  const hyperplaneVector = utils.zeros(dim);

  for (let i = 0; i < hyperplaneVector.length; i++) {
    hyperplaneVector[i] = data[left][i] - data[right][i];
    hyperplaneOffset -= (hyperplaneVector[i] * (data[left][i] + data[right][i])) / 2.0;
  }

  let nLeft = 0;
  let nRight = 0;
  const side = utils.zeros(indices.length);
  for (let i = 0; i < indices.length; i++) {
    let margin = hyperplaneOffset;
    for (let d = 0; d < dim; d++) {
      margin += hyperplaneVector[d] * data[indices[i]][d];
    }
    if (margin === 0) {
      side[i] = utils.tauRandInt(2, random);
      if (side[i] === 0) nLeft += 1;
      else nRight += 1;
    } else if (margin > 0) {
      side[i] = 0;
      nLeft += 1;
    } else {
      side[i] = 1;
      nRight += 1;
    }
  }

  const indicesLeft = utils.zeros(nLeft);
  const indicesRight = utils.zeros(nRight);
  nLeft = 0;
  nRight = 0;
  for (let i = 0; i < side.length; i++) {
    if (side[i] === 0) {
      indicesLeft[nLeft] = indices[i];
      nLeft += 1;
    } else {
      indicesRight[nRight] = indices[i];
      nRight += 1;
    }
  }

  return {
    indicesLeft,
    indicesRight,
    hyperplane: hyperplaneVector,
    offset: hyperplaneOffset,
  };
}

function flattenTree(tree: RandomProjectionTreeNode, leafSize: number): FlatTree {
  const nNodes = numNodes(tree);
  const nLeaves = numLeaves(tree);

  const hyperplanes = utils
    .range(nNodes)
    .map(() => utils.zeros(tree.hyperplane ? tree.hyperplane.length : 0));
  const offsets = utils.zeros(nNodes);
  const children = utils.range(nNodes).map(() => [-1, -1]);
  const indices = utils.range(nLeaves).map(() => utils.range(leafSize).map(() => -1));

  recursiveFlatten(tree, hyperplanes, offsets, children, indices, 0, 0);
  return new FlatTree(hyperplanes, offsets, children, indices);
}

function recursiveFlatten(
  tree: RandomProjectionTreeNode,
  hyperplanes: number[][],
  offsets: number[],
  children: number[][],
  indices: number[][],
  nodeNum: number,
  leafNum: number
): { nodeNum: number; leafNum: number } {
  if (tree.isLeaf) {
    children[nodeNum][0] = -leafNum;
    indices[leafNum].splice(0, tree.indices!.length, ...tree.indices!);
    leafNum += 1;
    return { nodeNum, leafNum };
  } else {
    hyperplanes[nodeNum] = tree.hyperplane!;
    offsets[nodeNum] = tree.offset!;
    children[nodeNum][0] = nodeNum + 1;
    const oldNodeNum = nodeNum;

    let res = recursiveFlatten(
      tree.leftChild!,
      hyperplanes,
      offsets,
      children,
      indices,
      nodeNum + 1,
      leafNum
    );
    nodeNum = res.nodeNum;
    leafNum = res.leafNum;

    children[oldNodeNum][1] = nodeNum + 1;

    res = recursiveFlatten(
      tree.rightChild!,
      hyperplanes,
      offsets,
      children,
      indices,
      nodeNum + 1,
      leafNum
    );
    return { nodeNum: res.nodeNum, leafNum: res.leafNum };
  }
}

function numNodes(tree: RandomProjectionTreeNode): number {
  if (tree.isLeaf) return 1;
  return 1 + numNodes(tree.leftChild!) + numNodes(tree.rightChild!);
}

function numLeaves(tree: RandomProjectionTreeNode): number {
  if (tree.isLeaf) return 1;
  return numLeaves(tree.leftChild!) + numLeaves(tree.rightChild!);
}

/** Generate leaf arrays from the forest for seeding NN-descent. */
export function makeLeafArray(rpForest: FlatTree[]): number[][] {
  if (rpForest.length > 0) {
    const output: number[][] = [];
    for (const t of rpForest) {
      output.push(...t.indices);
    }
    return output;
  }
  return [[-1]];
}

function selectSide(hyperplane: number[], offset: number, point: Vector, random: RandomFn): number {
  let margin = offset;
  for (let d = 0; d < point.length; d++) {
    margin += hyperplane[d] * point[d];
  }
  if (margin === 0) return utils.tauRandInt(2, random);
  return margin > 0 ? 0 : 1;
}

/** Search a flattened RP-tree for a point's leaf. */
export function searchFlatTree(point: Vector, tree: FlatTree, random: RandomFn): number[] {
  let node = 0;
  while (tree.children[node][0] > 0) {
    const side = selectSide(tree.hyperplanes[node], tree.offsets[node], point, random);
    node = side === 0 ? tree.children[node][0] : tree.children[node][1];
  }
  const index = -1 * tree.children[node][0];
  return tree.indices[index];
}
