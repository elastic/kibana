/**
 * Shared utility functions for memory backend implementations.
 *
 * This module contains both user-facing string formatters and structured
 * helpers used by backends and the composite router. Structured helpers
 * enable composition without fragile string parsing.
 */
import type { FileData, GrepMatch } from "./protocol";
export declare const EMPTY_CONTENT_WARNING = "System reminder: File exists but has empty contents";
export declare const MAX_LINE_LENGTH = 10000;
export declare const LINE_NUMBER_WIDTH = 6;
export declare const TOOL_RESULT_TOKEN_LIMIT = 20000;
export declare const TRUNCATION_GUIDANCE = "... [results truncated, try being more specific with your parameters]";
/**
 * Sanitize tool_call_id to prevent path traversal and separator issues.
 *
 * Replaces dangerous characters (., /, \) with underscores.
 */
export declare function sanitizeToolCallId(toolCallId: string): string;
/**
 * Format file content with line numbers (cat -n style).
 *
 * Chunks lines longer than MAX_LINE_LENGTH with continuation markers (e.g., 5.1, 5.2).
 *
 * @param content - File content as string or list of lines
 * @param startLine - Starting line number (default: 1)
 * @returns Formatted content with line numbers and continuation markers
 */
export declare function formatContentWithLineNumbers(content: string | string[], startLine?: number): string;
/**
 * Check if content is empty and return warning message.
 *
 * @param content - Content to check
 * @returns Warning message if empty, null otherwise
 */
export declare function checkEmptyContent(content: string): string | null;
/**
 * Convert FileData to plain string content.
 *
 * @param fileData - FileData object with 'content' key
 * @returns Content as string with lines joined by newlines
 */
export declare function fileDataToString(fileData: FileData): string;
/**
 * Create a FileData object with timestamps.
 *
 * @param content - File content as string
 * @param createdAt - Optional creation timestamp (ISO format)
 * @returns FileData object with content and timestamps
 */
export declare function createFileData(content: string, createdAt?: string): FileData;
/**
 * Update FileData with new content, preserving creation timestamp.
 *
 * @param fileData - Existing FileData object
 * @param content - New content as string
 * @returns Updated FileData object
 */
export declare function updateFileData(fileData: FileData, content: string): FileData;
/**
 * Format file data for read response with line numbers.
 *
 * @param fileData - FileData object
 * @param offset - Line offset (0-indexed)
 * @param limit - Maximum number of lines
 * @returns Formatted content or error message
 */
export declare function formatReadResponse(fileData: FileData, offset: number, limit: number): string;
/**
 * Perform string replacement with occurrence validation.
 *
 * @param content - Original content
 * @param oldString - String to replace
 * @param newString - Replacement string
 * @param replaceAll - Whether to replace all occurrences
 * @returns Tuple of [new_content, occurrences] on success, or error message string
 */
export declare function performStringReplacement(content: string, oldString: string, newString: string, replaceAll: boolean): [string, number] | string;
/**
 * Truncate list or string result if it exceeds token limit (rough estimate: 4 chars/token).
 */
export declare function truncateIfTooLong(result: string[] | string): string[] | string;
/**
 * Validate and normalize a path.
 *
 * @param path - Path to validate
 * @returns Normalized path starting with / and ending with /
 * @throws Error if path is invalid
 */
export declare function validatePath(path: string | null | undefined): string;
/**
 * Search files dict for paths matching glob pattern.
 *
 * @param files - Dictionary of file paths to FileData
 * @param pattern - Glob pattern (e.g., `*.py`, `**\/*.ts`)
 * @param path - Base path to search from
 * @returns Newline-separated file paths, sorted by modification time (most recent first).
 *          Returns "No files found" if no matches.
 *
 * @example
 * ```typescript
 * const files = {"/src/main.py": FileData(...), "/test.py": FileData(...)};
 * globSearchFiles(files, "*.py", "/");
 * // Returns: "/test.py\n/src/main.py" (sorted by modified_at)
 * ```
 */
export declare function globSearchFiles(files: Record<string, FileData>, pattern: string, path?: string): string;
/**
 * Format grep search results based on output mode.
 *
 * @param results - Dictionary mapping file paths to list of [line_num, line_content] tuples
 * @param outputMode - Output format - "files_with_matches", "content", or "count"
 * @returns Formatted string output
 */
export declare function formatGrepResults(results: Record<string, Array<[number, string]>>, outputMode: "files_with_matches" | "content" | "count"): string;
/**
 * Search file contents for regex pattern.
 *
 * @param files - Dictionary of file paths to FileData
 * @param pattern - Regex pattern to search for
 * @param path - Base path to search from
 * @param glob - Optional glob pattern to filter files (e.g., "*.py")
 * @param outputMode - Output format - "files_with_matches", "content", or "count"
 * @returns Formatted search results. Returns "No matches found" if no results.
 *
 * @example
 * ```typescript
 * const files = {"/file.py": FileData({content: ["import os", "print('hi')"], ...})};
 * grepSearchFiles(files, "import", "/");
 * // Returns: "/file.py" (with output_mode="files_with_matches")
 * ```
 */
export declare function grepSearchFiles(files: Record<string, FileData>, pattern: string, path?: string | null, glob?: string | null, outputMode?: "files_with_matches" | "content" | "count"): string;
/**
 * Return structured grep matches from an in-memory files mapping.
 *
 * Returns a list of GrepMatch on success, or a string for invalid inputs
 * (e.g., invalid regex). We deliberately do not raise here to keep backends
 * non-throwing in tool contexts and preserve user-facing error messages.
 */
export declare function grepMatchesFromFiles(files: Record<string, FileData>, pattern: string, path?: string | null, glob?: string | null): GrepMatch[] | string;
/**
 * Group structured matches into the legacy dict form used by formatters.
 */
export declare function buildGrepResultsDict(matches: GrepMatch[]): Record<string, Array<[number, string]>>;
/**
 * Format structured grep matches using existing formatting logic.
 */
export declare function formatGrepMatches(matches: GrepMatch[], outputMode: "files_with_matches" | "content" | "count"): string;
