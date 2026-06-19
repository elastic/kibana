/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// File-entry shape kept around for ResultStore/SkillsStore typed accessors —
// `FileEntry.metadata` is what consumers like `tryFilestoreSubstitution` and
// `load_skill_tools_after_read` read. The legacy `IFileStore` aggregator that
// originally owned these types has been deleted.
export {
  FileEntryType,
  type FileEntry,
  type FsEntry,
  type FileEntryContent,
  type FileEntryMetadata,
  type DirEntry,
} from './filesystem';
