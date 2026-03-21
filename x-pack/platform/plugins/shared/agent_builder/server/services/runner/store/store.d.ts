import type { IFileStore, FileEntry, LsEntry, GrepMatch } from '@kbn/agent-builder-server/runner/filestore';
import type { IVirtualFileSystem } from './filesystem';
export declare class FileSystemStore implements IFileStore {
    private readonly filesystem;
    constructor({ filesystem }: {
        filesystem: IVirtualFileSystem;
    });
    /**
     * Read a file entry from the store.
     * Returns undefined if the path doesn't exist or is a directory.
     */
    read(path: string): Promise<FileEntry | undefined>;
    /**
     * List files and directories at the given path.
     * When depth > 1, directories will contain nested children.
     */
    ls(path: string, options?: {
        depth?: number;
    }): Promise<LsEntry[]>;
    /**
     * List files matching the given glob pattern.
     */
    glob(pattern: string): Promise<FileEntry[]>;
    /**
     * Search files with text matching the given pattern.
     * By default, pattern is treated as a regex. Use `fixed: true` for literal text matching.
     */
    grep(pattern: string, globPattern: string, options?: {
        context?: number;
        fixed?: boolean;
    }): Promise<GrepMatch[]>;
    /**
     * Create a regex-based matcher function.
     */
    private createRegexMatcher;
    /**
     * Build a nested tree structure from a flat list of entries.
     */
    private buildTree;
    /**
     * Get the searchable text content of a file.
     * Uses plain_text if available, otherwise stringifies raw content.
     */
    private getSearchableText;
    /**
     * Extract lines around a match with the specified context.
     */
    private extractWithContext;
}
