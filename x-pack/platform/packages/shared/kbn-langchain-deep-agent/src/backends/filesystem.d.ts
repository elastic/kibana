/**
 * FilesystemBackend: Read and write files directly from the filesystem.
 *
 * Security and search upgrades:
 * - Secure path resolution with root containment when in virtual_mode (sandboxed to cwd)
 * - Prevent symlink-following on file I/O using O_NOFOLLOW when available
 * - Ripgrep-powered grep with JSON parsing, plus regex fallback
 *   and optional glob include filtering, while preserving virtual path behavior
 */
import type { BackendProtocol, EditResult, FileInfo, GrepMatch, WriteResult } from "./protocol";
/**
 * Backend that reads and writes files directly from the filesystem.
 *
 * Files are accessed using their actual filesystem paths. Relative paths are
 * resolved relative to the current working directory. Content is read/written
 * as plain text, and metadata (timestamps) are derived from filesystem stats.
 */
export declare class FilesystemBackend implements BackendProtocol {
    private cwd;
    private virtualMode;
    private maxFileSizeBytes;
    constructor(options?: {
        rootDir?: string;
        virtualMode?: boolean;
        maxFileSizeMb?: number;
    });
    /**
     * Resolve a file path with security checks.
     *
     * When virtualMode=true, treat incoming paths as virtual absolute paths under
     * this.cwd, disallow traversal (.., ~) and ensure resolved path stays within root.
     * When virtualMode=false, preserve legacy behavior: absolute paths are allowed
     * as-is; relative paths resolve under cwd.
     *
     * @param key - File path (absolute, relative, or virtual when virtualMode=true)
     * @returns Resolved absolute path string
     * @throws Error if path traversal detected or path outside root
     */
    private resolvePath;
    /**
     * List files and directories in the specified directory (non-recursive).
     *
     * @param dirPath - Absolute directory path to list files from
     * @returns List of FileInfo objects for files and directories directly in the directory.
     *          Directories have a trailing / in their path and is_dir=true.
     */
    lsInfo(dirPath: string): Promise<FileInfo[]>;
    /**
     * Read file content with line numbers.
     *
     * @param filePath - Absolute or relative file path
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
    grepRaw(pattern: string, dirPath?: string, glob?: string | null): Promise<GrepMatch[] | string>;
    /**
     * Try to use ripgrep for fast searching.
     * Returns null if ripgrep is not available or fails.
     */
    private ripgrepSearch;
    /**
     * Fallback regex search implementation.
     */
    private pythonSearch;
    /**
     * Structured glob matching returning FileInfo objects.
     */
    globInfo(pattern: string, searchPath?: string): Promise<FileInfo[]>;
}
