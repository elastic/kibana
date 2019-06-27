/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexRequest } from './search';

export type RepositoryUri = string;

export interface Repository {
  /** In the form of git://github.com/lambdalab/lambdalab  */
  uri: RepositoryUri;
  /** Original Clone Url */
  url: string;
  name?: string;
  org?: string;
  defaultBranch?: string;
  revision?: string;
  protocol?: string;
  // The timestamp of next update for this repository.
  nextUpdateTimestamp?: Date;
  // The timestamp of next index for this repository.
  nextIndexTimestamp?: Date;
  // The current indexed revision in Elasticsearch.
  indexedRevision?: string;
}

export interface RepositoryConfig {
  uri: RepositoryUri;
  disableGo?: boolean;
  disableJava?: boolean;
  disableTypescript?: boolean;
}

export interface FileTree {
  name: string;
  type: FileTreeItemType;

  /** Full Path of the tree, don't need to be set by the server */
  path?: string;
  /**
   * Children of the file tree, if it is undefined, then it's a file, if it is null, it means it is a
   * directory and its children haven't been evaluated.
   */
  children?: FileTree[];
  /**
   * count of children nodes for current node, use this for pagination
   */
  childrenCount?: number;
  sha1?: string;
  /**
   *  current repo uri
   */
  repoUri?: string;
}

export function sortFileTree(a: FileTree, b: FileTree) {
  if (a.type !== b.type) {
    return b.type - a.type;
  } else {
    return a.name.localeCompare(b.name);
  }
}

export enum FileTreeItemType {
  File,
  Directory,
  Submodule,
  Link,
}

export interface WorkerResult {
  uri: string;
  cancelled?: boolean;
}

// TODO(mengwei): create a AbstractGitWorkerResult since we now have an
// AbstractGitWorker now.
export interface CloneWorkerResult extends WorkerResult {
  repo: Repository;
}

export interface DeleteWorkerResult extends WorkerResult {
  res: boolean;
}

export interface UpdateWorkerResult extends WorkerResult {
  branch: string;
  revision: string;
}

export enum IndexStatsKey {
  File = 'file-added-count',
  FileDeleted = 'file-deleted-count',
  Symbol = 'symbol-added-count',
  SymbolDeleted = 'symbol-deleted-count',
  Reference = 'reference-added-count',
  ReferenceDeleted = 'reference-deleted-count',
}
export type IndexStats = Map<IndexStatsKey, number>;

export interface IndexWorkerResult extends WorkerResult {
  revision: string;
  stats: IndexStats;
}

export enum WorkerReservedProgress {
  INIT = 0,
  COMPLETED = 100,
  ERROR = -100,
  TIMEOUT = -200,
}

export interface WorkerProgress {
  // Job payload repository uri.
  uri: string;
  progress: number;
  timestamp: Date;
  revision?: string;
  errorMessage?: string;
}

export interface CloneProgress {
  isCloned?: boolean;
  receivedObjects: number;
  indexedObjects: number;
  totalObjects: number;
  localObjects: number;
  totalDeltas: number;
  indexedDeltas: number;
  receivedBytes: number;
}

export interface CloneWorkerProgress extends WorkerProgress {
  cloneProgress?: CloneProgress;
}

export interface IndexProgress {
  type: string;
  total: number;
  success: number;
  fail: number;
  percentage: number;
  checkpoint?: IndexRequest;
}

export interface IndexWorkerProgress extends WorkerProgress {
  indexProgress?: IndexProgress;
}
