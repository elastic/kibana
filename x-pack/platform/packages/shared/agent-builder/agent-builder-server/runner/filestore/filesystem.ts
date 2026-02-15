/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Possible types of entries stored in the store.
 */
export enum FileEntryType {
  toolResult = 'tool_result',
  attachment = 'attachment',
  skill = 'skill',
  skillReferenceContent = 'skill_reference_content',
}

export type FileEntryMetadata<TExtraMeta extends object = {}> = {
  /**
   * Type of the entry (tool_result, attachment...)
   */
  type: FileEntryType;
  /**
   * Unique identifier of the entry, (unique for its type)
   */
  id: string;
  /**
   * Defines if the entry can be modified or not.
   */
  readonly: boolean;
} /** extra per-type metadata */ & TExtraMeta;

export type FilestoreVersionedEntryMetadata<TExtraMeta extends object = {}> =
  FileEntryMetadata<TExtraMeta> & {
    /**
     * True when the entry has more than one version.
     */
    versioned: boolean;
    /**
     * Latest version number (only when versioned is true).
     */
    last_version?: number;
  };

export interface FileEntryContent<TData extends object = object> {
  /**
   * Raw content of the file.
   */
  raw: TData;
  /**
   * Plain text representation of the file content, which can be used for grep.
   */
  plain_text?: string;
}

export interface FileEntryVersionMetadata {
  /**
   * Estimated length, in tokens, of the content of the raw content.
   */
  token_count: number;
  /**
   * Optional textual summary of the change introduced by this version.
   */
  version_change?: string;
}

export interface FileEntryVersion<TContent extends object = object> {
  version: number;
  content: FileEntryContent<TContent>;
  metadata: FileEntryVersionMetadata;
}

/**
 * A file entry in the virtual filesystem.
 */
export interface FileEntry<TContent extends object = object, TMeta extends object = object> {
  path: string;
  type: 'file';
  metadata: FileEntryMetadata<TMeta>;
  versions: FileEntryVersion<TContent>[];
}

export interface FilestoreEntry<TContent extends object = object, TMeta extends object = object> {
  path: string;
  type: 'file';
  metadata: FilestoreEntryMetadata<TMeta>;
  content: FileEntryContent<TContent>;
}

export type FilestoreEntryMetadata<TMeta extends object = object> = FileEntryMetadata<TMeta> &
  FileEntryVersionMetadata & {
    version: number;
    last_version: number;
  };

export interface FilestoreVersionedEntry<
  TContent extends object = object,
  TMeta extends object = object
> {
  path: string;
  type: 'file';
  metadata: FilestoreVersionedEntryMetadata<TMeta>;
  versions: FileEntryVersion<TContent>[];
}

/**
 * A directory entry in the virtual filesystem.
 */
export interface DirEntry {
  path: string;
  type: 'dir';
}

/**
 * Either a file or directory entry.
 */
export type FsEntry = FileEntry | DirEntry;
