import type { FileEntry, FsEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { Volume, VolumeGlobOptions } from './types';
/**
 * A volume that stores file entries in memory.
 * Suitable for eager data like tool results and attachments.
 */
export declare class MemoryVolume implements Volume {
    readonly id: string;
    /** Map of normalized path to FileEntry for O(1) file lookup */
    private readonly fileIndex;
    /** Root of the directory tree */
    private readonly root;
    constructor(id: string);
    /**
     * Add a file entry to this volume.
     * The entry's path will be normalized.
     */
    add(entry: FileEntry): void;
    /**
     * Remove an entry by path.
     * Returns true if an entry was removed, false if no entry existed at that path.
     */
    remove(path: string): boolean;
    /**
     * Clear all entries from this volume.
     */
    clear(): void;
    /**
     * Check if this volume contains a file at the given path.
     * Note: This only checks for files, not implicit directories.
     */
    has(path: string): boolean;
    get(path: string): Promise<FileEntry | undefined>;
    list(dirPath: string): Promise<FsEntry[]>;
    glob(patterns: string | string[], options?: VolumeGlobOptions): Promise<FsEntry[]>;
    exists(path: string): Promise<boolean>;
    dispose(): Promise<void>;
    private createDirNode;
    /**
     * Add a file entry to the directory tree.
     * Creates intermediate directories as needed.
     */
    private addToTree;
    /**
     * Remove a file from the directory tree.
     * Cleans up empty intermediate directories.
     */
    private removeFromTree;
    /**
     * Get the DirNode at the given path, or undefined if it doesn't exist.
     */
    private getNode;
    /**
     * Get all implicit directory paths.
     */
    private getAllDirectoryPaths;
}
