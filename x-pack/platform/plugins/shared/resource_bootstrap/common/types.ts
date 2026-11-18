/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type BootstrapStatus = 'running' | 'completed' | 'failed';

export interface KindResult {
  /** Resources written, including the ones created. */
  applied: number;
  /** The written resources that did not exist before. */
  created?: number;
  /** Owned resources left as they were, since neither their declaration nor they changed. */
  unchanged?: number;
  failed: number;
  /** Resources deleted because the bootstrap owns them but they are no longer in the files. */
  pruned?: number;
}

/**
 * An object the bootstrap owns. The entry is written before the object is created, so a run stopped
 * in between still owns it, and the object is deleted once it leaves the files.
 */
export interface LedgerEntry {
  kind: string;
  /** The declared id. */
  id: string;
  /** The spaces it was last declared in, sorted; empty for a kind not tied to a space. */
  spaces: string[];
  /**
   * Hash of the declaration last written, with the settings that affect the write; absent until
   * the first write is recorded.
   */
  appliedHash?: string;
  /** The stored version right after that write. */
  objectVersion?: string;
  /** The stored `updated_at` right after that write, which upgrade migrations keep. */
  objectUpdatedAt?: string;
  /** The Kibana version that made that write. */
  kibanaVersion?: string;
}

export interface BootstrapError {
  /** Absent for an error of the whole run, such as a file that could not be read. */
  kind?: string;
  /** Absent for an error not tied to a space. */
  spaceId?: string;
  id?: string;
  message: string;
}

export interface BootstrapStatusAttributes {
  /** Hash of the mounted files this record describes; `null` when the files could not be read. */
  hash: string | null;
  status: BootstrapStatus;
  startedAt?: string;
  finishedAt?: string;
  kinds: Record<string, KindResult>;
  errors: BootstrapError[];
  /** The highest request number taken before this run read the files; internal, not served. */
  coveredRequestNumber?: number;
  /**
   * Hash of the settings that change what a run writes or deletes, and of the Kibana version;
   * internal, not served.
   */
  settingsHash?: string;
  /**
   * The highest request number whose run finished, completed or failed, so an older request does
   * not undo it; internal, not served.
   */
  finishedRequestNumber?: number;
  /**
   * The highest `REVISION` of the files a run started to apply, kept through failed runs, so files
   * with a lower one are not applied; internal, not served.
   */
  revision?: number;
}

export type BootstrapStatusResponse =
  | { status: 'none'; hash: null; kinds: Record<string, never>; errors: [] }
  | Omit<
      BootstrapStatusAttributes,
      'coveredRequestNumber' | 'settingsHash' | 'finishedRequestNumber' | 'revision'
    >;
