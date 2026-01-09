/**
 * StateBackend: Store files in LangGraph agent state (ephemeral).
 */
import type { BackendProtocol, EditResult, FileInfo, GrepMatch, StateAndStore, WriteResult } from "./protocol";
/**
 * Backend that stores files in agent state (ephemeral).
 *
 * Uses LangGraph's state management and checkpointing. Files persist within
 * a conversation thread but not across threads. State is automatically
 * checkpointed after each agent step.
 *
 * Special handling: Since LangGraph state must be updated via Command objects
 * (not direct mutation), operations return filesUpdate in WriteResult/EditResult
 * for the middleware to apply via Command.
 */
export declare class StateBackend implements BackendProtocol {
    private stateAndStore;
    constructor(stateAndStore: StateAndStore);
    /**
     * Get files from current state.
     */
    private getFiles;
    /**
     * List files and directories in the specified directory (non-recursive).
     *
     * @param path - Absolute path to directory
     * @returns List of FileInfo objects for files and directories directly in the directory.
     *          Directories have a trailing / in their path and is_dir=true.
     */
    lsInfo(path: string): FileInfo[];
    /**
     * Read file content with line numbers.
     *
     * @param filePath - Absolute file path
     * @param offset - Line offset to start reading from (0-indexed)
     * @param limit - Maximum number of lines to read
     * @returns Formatted file content with line numbers, or error message
     */
    read(filePath: string, offset?: number, limit?: number): string;
    /**
     * Create a new file with content.
     * Returns WriteResult with filesUpdate to update LangGraph state.
     */
    write(filePath: string, content: string): WriteResult;
    /**
     * Edit a file by replacing string occurrences.
     * Returns EditResult with filesUpdate and occurrences.
     */
    edit(filePath: string, oldString: string, newString: string, replaceAll?: boolean): EditResult;
    /**
     * Structured search results or error string for invalid input.
     */
    grepRaw(pattern: string, path?: string, glob?: string | null): GrepMatch[] | string;
    /**
     * Structured glob matching returning FileInfo objects.
     */
    globInfo(pattern: string, path?: string): FileInfo[];
}
