/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FileEntryType,
  type FileEntry,
  type FilestoreEntry,
  type FilestoreVersionedEntry,
  type DirEntryWithChildren,
  type LsEntry,
  type FileEntryContent,
} from '@kbn/agent-builder-server/runner/filestore';

export interface CreateFileEntryOptions<TContent extends object = object> {
  /** The raw content of the file */
  content?: FileEntryContent<TContent>;
  /** Token count for the version metadata */
  tokenCount?: number;
  /** Additional overrides for the FileEntry */
  overrides?: Partial<FileEntry<TContent>>;
}

/**
 * Creates a FileEntry for use in volume tests.
 * FileEntry uses FileEntryMetadataInput (no versioned/last_version fields).
 */
export const createFileEntry = <TContent extends object = object>(
  path: string,
  options: CreateFileEntryOptions<TContent> = {}
): FileEntry<TContent> => {
  const { content, tokenCount = 100, overrides = {} } = options;

  const defaultContent: FileEntryContent<TContent> = content ?? {
    raw: { name: `content for ${path}` } as TContent,
  };

  return {
    path,
    type: 'file',
    metadata: {
      type: FileEntryType.toolResult,
      id: path,
      readonly: true,
    },
    versions: [
      {
        version: 1,
        content: defaultContent,
        metadata: {
          token_count: tokenCount,
        },
      },
    ],
    ...overrides,
  };
};

export interface CreateFilestoreVersionedEntryOptions<TContent extends object = object> {
  /** The raw content of the file */
  content?: FileEntryContent<TContent>;
  /** Token count for the version metadata */
  tokenCount?: number;
  /** Whether the entry is versioned (has multiple versions) */
  versioned?: boolean;
  /** Additional overrides for the FilestoreVersionedEntry */
  overrides?: Partial<FilestoreVersionedEntry<TContent>>;
}

/**
 * Creates a FilestoreVersionedEntry for use in store tests.
 * FilestoreVersionedEntry uses FileEntryMetadata (with versioned/last_version fields).
 */
export const createFilestoreVersionedEntry = <TContent extends object = object>(
  path: string,
  options: CreateFilestoreVersionedEntryOptions<TContent> = {}
): FilestoreVersionedEntry<TContent> => {
  const { content, tokenCount = 100, versioned = false, overrides = {} } = options;

  const defaultContent: FileEntryContent<TContent> = content ?? {
    raw: { name: `content for ${path}` } as TContent,
  };

  return {
    path,
    type: 'file',
    metadata: {
      type: FileEntryType.toolResult,
      id: path,
      readonly: true,
      versioned,
    },
    versions: [
      {
        version: 1,
        content: defaultContent,
        metadata: {
          token_count: tokenCount,
        },
      },
    ],
    ...overrides,
  };
};

export interface CreateFilestoreEntryOptions<TContent extends object = object> {
  /** The raw content of the file */
  content?: FileEntryContent<TContent>;
  /** Token count for the version metadata */
  tokenCount?: number;
  /** Version number */
  version?: number;
  /** Latest version number */
  lastVersion?: number;
  /** Additional overrides for the FilestoreEntry */
  overrides?: Partial<FilestoreEntry<TContent>>;
}

/**
 * Creates a FilestoreEntry for use in ls/glob/grep tests.
 * FilestoreEntry is the flattened single-version entry returned by read/ls/glob/grep.
 */
export const createFilestoreEntry = <TContent extends object = object>(
  path: string,
  options: CreateFilestoreEntryOptions<TContent> = {}
): FilestoreEntry<TContent> => {
  const { content, tokenCount = 100, version = 1, lastVersion, overrides = {} } = options;
  const resolvedLastVersion = lastVersion ?? version;

  const defaultContent: FileEntryContent<TContent> = content ?? {
    raw: { name: `content for ${path}` } as TContent,
  };

  return {
    path,
    type: 'file',
    metadata: {
      type: FileEntryType.toolResult,
      id: path,
      readonly: true,
      token_count: tokenCount,
      version,
      last_version: resolvedLastVersion,
    },
    content: defaultContent,
    ...overrides,
  };
};

/**
 * Creates a DirEntryWithChildren for use in ls/tree tests.
 */
export const createDirEntry = (path: string, children?: LsEntry[]): DirEntryWithChildren => ({
  path,
  type: 'dir',
  children,
});

/**
 * Converts a FilestoreVersionedEntry to a FilestoreEntry by extracting the latest version.
 * Useful for mocking IFileStore.read() which returns FilestoreEntry.
 */
export const toFilestoreEntry = <TContent extends object = object>(
  entry?: FilestoreVersionedEntry<TContent>
): FilestoreEntry<TContent> | undefined => {
  if (!entry) {
    return undefined;
  }
  const latest = entry.versions.reduce((current, next) =>
    next.version > current.version ? next : current
  );
  return {
    path: entry.path,
    type: 'file',
    metadata: {
      ...entry.metadata,
      ...latest.metadata,
      version: latest.version,
      last_version: latest.version,
    },
    content: latest.content,
  };
};
