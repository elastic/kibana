import type { FsEntry } from '@kbn/agent-builder-server/runner/filestore';
import type { Volume, MountOptions, GlobOptions, ListOptions, IVirtualFileSystem } from './types';
/**
 * A virtual filesystem that aggregates multiple volumes.
 *
 * The VFS is a thin orchestration layer that:
 * 1. Receives a request (get, list, glob)
 * 2. Queries each mounted volume in priority order
 * 3. Aggregates results (first-wins for files, merge for directories)
 * 4. Returns combined result
 */
export declare class VirtualFileSystem implements IVirtualFileSystem {
    private readonly mountedVolumes;
    private mountCounter;
    /**
     * Mount a volume.
     * Returns a function to unmount the volume.
     *
     * @param volume The volume to mount
     * @param options Mount options (priority, etc.)
     * @returns A function to unmount the volume
     */
    mount(volume: Volume, options?: MountOptions): () => Promise<void>;
    /**
     * Get entry by exact path.
     * Queries volumes in priority order, returns first match (first-wins for files).
     * For directories, returns a DirEntry if any volume has that directory.
     */
    get(path: string): Promise<FsEntry | undefined>;
    /**
     * List contents of a directory.
     * Aggregates results from all volumes, merging directories and using first-wins for files.
     */
    list(dirPath: string, options?: ListOptions): Promise<FsEntry[]>;
    /**
     * Find entries matching glob pattern(s).
     * Aggregates results from all volumes.
     */
    glob(patterns: string | string[], options?: GlobOptions): Promise<FsEntry[]>;
    /**
     * Check if path exists (file or directory) in any volume.
     */
    exists(path: string): Promise<boolean>;
    /**
     * Check if path is a directory.
     */
    isDirectory(path: string): Promise<boolean>;
    /**
     * Check if path is a file.
     */
    isFile(path: string): Promise<boolean>;
    /**
     * Unmount all volumes and cleanup.
     */
    dispose(): Promise<void>;
    /**
     * Sort volumes by priority (lower = higher priority), then by mount order.
     */
    private sortVolumes;
    /**
     * List a single directory level, aggregating from all volumes.
     */
    private listSingleLevel;
    /**
     * Recursively list directories up to maxDepth.
     */
    private listRecursive;
}
