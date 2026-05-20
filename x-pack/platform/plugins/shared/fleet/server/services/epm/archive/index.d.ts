import type { ArchiveEntry, ArchiveIterator, AssetParts, AssetsMap } from '../../../../common/types';
import type { SharedKey } from './cache';
export * from './cache';
export { getBufferExtractor, untarBuffer, unzipBuffer } from './extract';
export { generatePackageInfoFromArchiveBuffer } from './parse';
export declare function unpackBufferToAssetsMap({ contentType, archiveBuffer, useStreaming, }: {
    contentType: string;
    archiveBuffer: Buffer;
    useStreaming: boolean | undefined;
}): Promise<{
    paths: string[];
    assetsMap: AssetsMap;
    archiveIterator: ArchiveIterator;
}>;
/**
 * This function extracts all archive entries into memory.
 *
 * NOTE: This is potentially dangerous for large archives and can cause OOM
 * errors. Use 'traverseArchiveEntries' instead to iterate over the entries
 * without storing them all in memory at once.
 *
 * @param archiveBuffer
 * @param contentType
 * @returns All the entries in the archive buffer
 */
export declare function unpackArchiveEntriesIntoMemory(archiveBuffer: Buffer, contentType: string): Promise<ArchiveEntry[]>;
export declare function traverseArchiveEntries(archiveBuffer: Buffer, contentType: string, onEntry: (entry: ArchiveEntry) => Promise<void>, readBuffer?: (path: string) => boolean): Promise<void>;
export declare const deletePackageCache: ({ name, version }: SharedKey) => void;
export declare function getPathParts(path: string): AssetParts;
export declare function getAssetFromAssetsMap(assetsMap: AssetsMap, key: string): Buffer<ArrayBufferLike>;
