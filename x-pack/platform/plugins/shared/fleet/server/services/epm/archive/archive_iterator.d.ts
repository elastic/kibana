import type { AssetsMap, ArchiveIterator } from '../../../../common/types';
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
export declare const createArchiveIterator: (archiveBuffer: Buffer, contentType: string) => ArchiveIterator;
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
export declare const createArchiveIteratorFromMap: (assetsMap: AssetsMap) => ArchiveIterator;
