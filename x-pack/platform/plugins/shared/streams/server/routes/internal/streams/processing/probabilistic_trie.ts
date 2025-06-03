/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint max-classes-per-file: ["error", 2] */

export class ProbabilisticTrie {
  public root = new TrieNode(null);

  public insert(chunks: string[]) {
    let currentNode: TrieNode = this.root;
    for (const chunk of chunks) {
      if (!currentNode.children.has(chunk)) {
        currentNode.children.set(chunk, new TrieNode(currentNode));
      }
      currentNode = currentNode.children.get(chunk)!;
      currentNode.count += 1;
    }
    this.root.count += 1;
  }

  *[Symbol.iterator]() {
    yield* this.root;
  }

  static fromArray(values: string[][]) {
    const trie = new ProbabilisticTrie();
    values.forEach((chunks) => trie.insert(chunks));
    return trie;
  }
}

/**
 * A tuple containing: level of node in tree, message chunks, probability of occurrence, node object.
 */
export type TrieTuple = [number, string[], number, TrieNode];

export class TrieNode {
  public count = 0;
  public children = new Map<string, TrieNode>();

  constructor(private parent: TrieNode | null) {}

  public isRoot() {
    return this.parent === null;
  }

  public isLeaf() {
    return this.children.size === 0;
  }

  public getProbability() {
    if (this.parent === null) {
      return 1;
    }
    return this.count / this.parent.count;
  }

  [Symbol.iterator]() {
    return this.getChunks(0, [], 1);
  }

  private isRelevant(parentChunks: string[]) {
    if (!parentChunks.length) {
      return false;
    }
    if (this.children.size === 1) {
      const onlyChild = getFirst(this.children)!;
      return this.count !== onlyChild.count;
    }
    return true;
  }

  private *getChunks(
    parentLevel: number,
    parentChunks: string[],
    parentProbability: number
  ): Generator<TrieTuple> {
    const isRelevant = this.isRelevant(parentChunks);
    if (isRelevant) {
      yield [parentLevel, parentChunks, parentProbability, this];
    }
    for (const [chunk, child] of this.children) {
      yield* child.getChunks(
        isRelevant ? parentLevel + 1 : parentLevel,
        [...parentChunks, chunk],
        parentProbability * child.getProbability()
      );
    }
  }
}

function getFirst<K, V>(map: Map<K, V>) {
  const result = map.values().next();
  if (!result.done) {
    return result.value;
  }
}
