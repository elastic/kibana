/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetsMap, ArchiveIterator, ArchiveEntry } from '../../../../common/types';

import { traverseArchiveEntries } from '.';

/**
 * Creates an iterator for traversing and extracting paths from an archive
 * buffer. This iterator is intended to be used for memory efficient traversal
 * of archive contents without extracting the entire archive into memory.
 *
 * @param archiveBuffer - The buffer containing the archive data.
 * @param contentType - The content type of the archive (e.g.,
 * 'application/zip').
 * @returns ArchiveIterator instance.
 *
 */
export const createArchiveIterator = (
  archiveBuffer: Buffer,
  contentType: string
): ArchiveIterator => {
  const paths: string[] = [];

  const traverseEntries = async (
    onEntry: (entry: ArchiveEntry) => Promise<void>,
    readBuffer?: (path: string) => boolean
  ): Promise<void> => {
    await traverseArchiveEntries(
      archiveBuffer,
      contentType,
      async (entry) => {
        await onEntry(entry);
      },
      readBuffer
    );
  };

  const getPaths = async (): Promise<string[]> => {
    if (paths.length) {
      return paths;
    }

    await traverseEntries(
      async (entry) => {
        paths.push(entry.path);
      },
      () => false
    );

    return paths;
  };

  return {
    traverseEntries,
    getPaths,
  };
};

/**
 * Creates an archive iterator from the assetsMap. This is a stop-gap solution
 * to provide a uniform interface for traversing assets while assetsMap is still
 * in use. It works with a map of assets loaded into memory and is not intended
 * for use with large archives.
 *
 * @param assetsMap - A map where the keys are asset paths and the values are
 * asset buffers.
 * @returns ArchiveIterator instance.
 *
 */
export const createArchiveIteratorFromMap = (assetsMap: AssetsMap): ArchiveIterator => {
  const traverseEntries = async (
    onEntry: (entry: ArchiveEntry) => Promise<void>
  ): Promise<void> => {
    for (const [path, buffer] of assetsMap) {
      await onEntry({ path, buffer });
    }
  };

  const getPaths = async (): Promise<string[]> => {
    return [...assetsMap.keys()];
  };

  return {
    traverseEntries,
    getPaths,
  };
};
