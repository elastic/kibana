/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition } from '../skills';
import type { FileEntry, FsEntry } from './filestore';

/**
 * Store to access skills during execution
 */
export interface SkillsStore {
  has(skillId: string): boolean;
  get(resultId: string): InternalSkillDefinition;
  /**
   * Lookup a skill file entry by its absolute path. Returns `undefined`
   * when the path doesn't belong to any registered skill. Use this when
   * you need typed per-file metadata (e.g. `metadata.skill_id`,
   * `metadata.type` to distinguish main files from reference content) that
   * the byte-level `IFileSystem.readFile` doesn't expose.
   */
  getEntry(path: string): Promise<FileEntry | undefined>;
  /**
   * List entries under a directory. Empty array when the directory doesn't
   * exist.
   */
  listEntries(dirPath: string): Promise<FsEntry[]>;
  /** Check whether the given path exists (file or directory) in the store. */
  entryExists(path: string): Promise<boolean>;
}

/**
 * Writable version of SkillsStore, used internally by the runner/agent
 */
export interface WritableSkillsStore extends SkillsStore {
  add(result: InternalSkillDefinition): void;
  delete(skillId: string): boolean;
  asReadonly(): SkillsStore;
}
