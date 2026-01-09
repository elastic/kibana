/**
 * CompositeBackend: Route operations to different backends based on path prefix.
 */
import type { BackendProtocol, EditResult, FileInfo, GrepMatch, WriteResult } from "./protocol";
/**
 * Backend that routes file operations to different backends based on path prefix.
 *
 * This enables hybrid storage strategies like:
 * - `/memories/` → StoreBackend (persistent, cross-thread)
 * - Everything else → StateBackend (ephemeral, per-thread)
 *
 * The CompositeBackend handles path prefix stripping/re-adding transparently.
 */
export declare class CompositeBackend implements BackendProtocol {
    private default;
    private routes;
    private sortedRoutes;
    constructor(defaultBackend: BackendProtocol, routes: Record<string, BackendProtocol>);
    /**
     * Determine which backend handles this key and strip prefix.
     *
     * @param key - Original file path
     * @returns Tuple of [backend, stripped_key] where stripped_key has the route
     *          prefix removed (but keeps leading slash).
     */
    private getBackendAndKey;
    /**
     * List files and directories in the specified directory (non-recursive).
     *
     * @param path - Absolute path to directory
     * @returns List of FileInfo objects with route prefixes added, for files and directories
     *          directly in the directory. Directories have a trailing / in their path and is_dir=true.
     */
    lsInfo(path: string): Promise<FileInfo[]>;
    /**
     * Read file content, routing to appropriate backend.
     *
     * @param filePath - Absolute file path
     * @param offset - Line offset to start reading from (0-indexed)
     * @param limit - Maximum number of lines to read
     * @returns Formatted file content with line numbers, or error message
     */
    read(filePath: string, offset?: number, limit?: number): Promise<string>;
    /**
     * Structured search results or error string for invalid input.
     */
    grepRaw(pattern: string, path?: string, glob?: string | null): Promise<GrepMatch[] | string>;
    /**
     * Structured glob matching returning FileInfo objects.
     */
    globInfo(pattern: string, path?: string): Promise<FileInfo[]>;
    /**
     * Create a new file, routing to appropriate backend.
     *
     * @param filePath - Absolute file path
     * @param content - File content as string
     * @returns WriteResult with path or error
     */
    write(filePath: string, content: string): Promise<WriteResult>;
    /**
     * Edit a file, routing to appropriate backend.
     *
     * @param filePath - Absolute file path
     * @param oldString - String to find and replace
     * @param newString - Replacement string
     * @param replaceAll - If true, replace all occurrences
     * @returns EditResult with path, occurrences, or error
     */
    edit(filePath: string, oldString: string, newString: string, replaceAll?: boolean): Promise<EditResult>;
}
