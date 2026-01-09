/**
 * Middleware for providing filesystem tools to an agent.
 *
 * Provides ls, read_file, write_file, edit_file, glob, and grep tools with support for:
 * - Pluggable backends (StateBackend, StoreBackend, FilesystemBackend, CompositeBackend)
 * - Tool result eviction for large outputs
 */
import type { BackendProtocol, BackendFactory, FileData } from "../backends/protocol";
export type { FileData };
export declare const LS_TOOL_DESCRIPTION = "List files and directories in a directory";
export declare const READ_FILE_TOOL_DESCRIPTION = "Read the contents of a file";
export declare const WRITE_FILE_TOOL_DESCRIPTION = "Write content to a new file. Returns an error if the file already exists";
export declare const EDIT_FILE_TOOL_DESCRIPTION = "Edit a file by replacing a specific string with a new string";
export declare const GLOB_TOOL_DESCRIPTION = "Find files matching a glob pattern (e.g., '**/*.py' for all Python files)";
export declare const GREP_TOOL_DESCRIPTION = "Search for a regex pattern in files. Returns matching files and line numbers";
/**
 * Options for creating filesystem middleware.
 */
export interface FilesystemMiddlewareOptions {
    /** Backend instance or factory (default: StateBackend) */
    backend?: BackendProtocol | BackendFactory;
    /** Optional custom system prompt override */
    systemPrompt?: string | null;
    /** Optional custom tool descriptions override */
    customToolDescriptions?: Record<string, string> | null;
    /**
     * Optional maximum number of filesystem entries to include in the injected
     * "Filesystem Overview" prompt. This prevents blowing the model context window
     * when thousands of files are mounted (e.g., skills).
     *
     * Set to `0` or `null` to disable the overview entirely.
     *
     * Default: 50
     */
    maxOverviewEntries?: number | null;
    /** Optional token limit before evicting a tool result to the filesystem (default: 20000 tokens, ~80KB) */
    toolTokenLimitBeforeEvict?: number | null;
}
/**
 * Create filesystem middleware with all tools and features.
 */
export declare function createFilesystemMiddleware(options?: FilesystemMiddlewareOptions): import("langchain").AgentMiddleware<any, undefined, any>;
