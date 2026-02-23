/**
 * StoreBackend: Adapter for LangGraph's BaseStore (persistent, cross-thread).
 */
import type { BackendProtocol, EditResult, FileInfo, GrepMatch, StateAndStore, WriteResult } from "./protocol";
/**
 * Backend that stores files in LangGraph's BaseStore (persistent).
 *
 * Uses LangGraph's Store for persistent, cross-conversation storage.
 * Files are organized via namespaces and persist across all threads.
 *
 * The namespace can include an optional assistant_id for multi-agent isolation.
 */
export declare class StoreBackend implements BackendProtocol {
    private stateAndStore;
    constructor(stateAndStore: StateAndStore);
    /**
     * Get the store instance.
     *
     * @returns BaseStore instance
     * @throws Error if no store is available
     */
    private getStore;
    /**
     * Get the namespace for store operations.
     *
     * If an assistant_id is available in stateAndStore, return
     * [assistant_id, "filesystem"] to provide per-assistant isolation.
     * Otherwise return ["filesystem"].
     */
    private getNamespace;
    /**
     * Convert a store Item to FileData format.
     *
     * @param storeItem - The store Item containing file data
     * @returns FileData object
     * @throws Error if required fields are missing or have incorrect types
     */
    private convertStoreItemToFileData;
    /**
     * Convert FileData to a value suitable for store.put().
     *
     * @param fileData - The FileData to convert
     * @returns Object with content, created_at, and modified_at fields
     */
    private convertFileDataToStoreValue;
    /**
     * Search store with automatic pagination to retrieve all results.
     *
     * @param store - The store to search
     * @param namespace - Hierarchical path prefix to search within
     * @param options - Optional query, filter, and page_size
     * @returns List of all items matching the search criteria
     */
    private searchStorePaginated;
    /**
     * List files and directories in the specified directory (non-recursive).
     *
     * @param path - Absolute path to directory
     * @returns List of FileInfo objects for files and directories directly in the directory.
     *          Directories have a trailing / in their path and is_dir=true.
     */
    lsInfo(path: string): Promise<FileInfo[]>;
    /**
     * Read file content with line numbers.
     *
     * @param filePath - Absolute file path
     * @param offset - Line offset to start reading from (0-indexed)
     * @param limit - Maximum number of lines to read
     * @returns Formatted file content with line numbers, or error message
     */
    read(filePath: string, offset?: number, limit?: number): Promise<string>;
    /**
     * Create a new file with content.
     * Returns WriteResult. External storage sets filesUpdate=null.
     */
    write(filePath: string, content: string): Promise<WriteResult>;
    /**
     * Edit a file by replacing string occurrences.
     * Returns EditResult. External storage sets filesUpdate=null.
     */
    edit(filePath: string, oldString: string, newString: string, replaceAll?: boolean): Promise<EditResult>;
    /**
     * Structured search results or error string for invalid input.
     */
    grepRaw(pattern: string, path?: string, glob?: string | null): Promise<GrepMatch[] | string>;
    /**
     * Structured glob matching returning FileInfo objects.
     */
    globInfo(pattern: string, path?: string): Promise<FileInfo[]>;
}
