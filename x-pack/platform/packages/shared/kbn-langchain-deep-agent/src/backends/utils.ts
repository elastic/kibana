/**
 * Shared utility functions for memory backend implementations.
 *
 * This module contains both user-facing string formatters and structured
 * helpers used by backends and the composite router. Structured helpers
 * enable composition without fragile string parsing.
 */

import micromatch from "micromatch";
import { basename } from "path";
import type { FileData, GrepMatch } from "./protocol";

// Constants
export const EMPTY_CONTENT_WARNING =
  "System reminder: File exists but has empty contents";
export const MAX_LINE_LENGTH = 10000;
export const LINE_NUMBER_WIDTH = 6;
export const TOOL_RESULT_TOKEN_LIMIT = 20000; // Same threshold as eviction
export const TRUNCATION_GUIDANCE =
  "... [results truncated, try being more specific with your parameters]";

/**
 * Sanitize tool_call_id to prevent path traversal and separator issues.
 *
 * Replaces dangerous characters (., /, \) with underscores.
 */
export function sanitizeToolCallId(toolCallId: string): string {
  return toolCallId.replace(/\./g, "_").replace(/\//g, "_").replace(/\\/g, "_");
}

/**
 * Format file content with line numbers (cat -n style).
 *
 * Chunks lines longer than MAX_LINE_LENGTH with continuation markers (e.g., 5.1, 5.2).
 *
 * @param content - File content as string or list of lines
 * @param startLine - Starting line number (default: 1)
 * @returns Formatted content with line numbers and continuation markers
 */
export function formatContentWithLineNumbers(
  content: string | string[],
  startLine: number = 1,
): string {
  let lines: string[];
  if (typeof content === "string") {
    lines = content.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") {
      lines = lines.slice(0, -1);
    }
  } else {
    lines = content;
  }

  const resultLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + startLine;

    if (line.length <= MAX_LINE_LENGTH) {
      resultLines.push(
        `${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${line}`,
      );
    } else {
      // Split long line into chunks with continuation markers
      const numChunks = Math.ceil(line.length / MAX_LINE_LENGTH);
      for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
        const start = chunkIdx * MAX_LINE_LENGTH;
        const end = Math.min(start + MAX_LINE_LENGTH, line.length);
        const chunk = line.substring(start, end);
        if (chunkIdx === 0) {
          // First chunk: use normal line number
          resultLines.push(
            `${lineNum.toString().padStart(LINE_NUMBER_WIDTH)}\t${chunk}`,
          );
        } else {
          // Continuation chunks: use decimal notation (e.g., 5.1, 5.2)
          const continuationMarker = `${lineNum}.${chunkIdx}`;
          resultLines.push(
            `${continuationMarker.padStart(LINE_NUMBER_WIDTH)}\t${chunk}`,
          );
        }
      }
    }
  }

  return resultLines.join("\n");
}

/**
 * Check if content is empty and return warning message.
 *
 * @param content - Content to check
 * @returns Warning message if empty, null otherwise
 */
export function checkEmptyContent(content: string): string | null {
  if (!content || content.trim() === "") {
    return EMPTY_CONTENT_WARNING;
  }
  return null;
}

/**
 * Convert FileData to plain string content.
 *
 * @param fileData - FileData object with 'content' key
 * @returns Content as string with lines joined by newlines
 */
export function fileDataToString(fileData: FileData): string {
  return fileData.content.join("\n");
}

/**
 * Create a FileData object with timestamps.
 *
 * @param content - File content as string
 * @param createdAt - Optional creation timestamp (ISO format)
 * @returns FileData object with content and timestamps
 */
export function createFileData(content: string, createdAt?: string): FileData {
  const lines = typeof content === "string" ? content.split("\n") : content;
  const now = new Date().toISOString();

  return {
    content: lines,
    created_at: createdAt || now,
    modified_at: now,
  };
}

/**
 * Update FileData with new content, preserving creation timestamp.
 *
 * @param fileData - Existing FileData object
 * @param content - New content as string
 * @returns Updated FileData object
 */
export function updateFileData(fileData: FileData, content: string): FileData {
  const lines = typeof content === "string" ? content.split("\n") : content;
  const now = new Date().toISOString();

  return {
    content: lines,
    created_at: fileData.created_at,
    modified_at: now,
  };
}

/**
 * Format file data for read response with line numbers.
 *
 * @param fileData - FileData object
 * @param offset - Line offset (0-indexed)
 * @param limit - Maximum number of lines
 * @returns Formatted content or error message
 */
export function formatReadResponse(
  fileData: FileData,
  offset: number,
  limit: number,
): string {
  const content = fileDataToString(fileData);
  const emptyMsg = checkEmptyContent(content);
  if (emptyMsg) {
    return emptyMsg;
  }

  const lines = content.split("\n");
  const startIdx = offset;
  const endIdx = Math.min(startIdx + limit, lines.length);

  if (startIdx >= lines.length) {
    return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
  }

  const selectedLines = lines.slice(startIdx, endIdx);
  return formatContentWithLineNumbers(selectedLines, startIdx + 1);
}

/**
 * Perform string replacement with occurrence validation.
 *
 * @param content - Original content
 * @param oldString - String to replace
 * @param newString - Replacement string
 * @param replaceAll - Whether to replace all occurrences
 * @returns Tuple of [new_content, occurrences] on success, or error message string
 */
export function performStringReplacement(
  content: string,
  oldString: string,
  newString: string,
  replaceAll: boolean,
): [string, number] | string {
  // Use split to count occurrences (simpler than regex)
  const occurrences = content.split(oldString).length - 1;

  if (occurrences === 0) {
    return `Error: String not found in file: '${oldString}'`;
  }

  if (occurrences > 1 && !replaceAll) {
    return `Error: String '${oldString}' appears ${occurrences} times in file. Use replace_all=True to replace all instances, or provide a more specific string with surrounding context.`;
  }

  // Python's str.replace() replaces ALL occurrences
  // Use split/join for consistent behavior
  const newContent = content.split(oldString).join(newString);

  return [newContent, occurrences];
}

/**
 * Truncate list or string result if it exceeds token limit (rough estimate: 4 chars/token).
 */
export function truncateIfTooLong(
  result: string[] | string,
): string[] | string {
  if (Array.isArray(result)) {
    const totalChars = result.reduce((sum, item) => sum + item.length, 0);
    if (totalChars > TOOL_RESULT_TOKEN_LIMIT * 4) {
      const truncateAt = Math.floor(
        (result.length * TOOL_RESULT_TOKEN_LIMIT * 4) / totalChars,
      );
      return [...result.slice(0, truncateAt), TRUNCATION_GUIDANCE];
    }
    return result;
  }
  // string
  if (result.length > TOOL_RESULT_TOKEN_LIMIT * 4) {
    return (
      result.substring(0, TOOL_RESULT_TOKEN_LIMIT * 4) +
      "\n" +
      TRUNCATION_GUIDANCE
    );
  }
  return result;
}

/**
 * Validate and normalize a path.
 *
 * @param path - Path to validate
 * @returns Normalized path starting with / and ending with /
 * @throws Error if path is invalid
 */
export function validatePath(path: string | null | undefined): string {
  const pathStr = path || "/";
  if (!pathStr || pathStr.trim() === "") {
    throw new Error("Path cannot be empty");
  }

  let normalized = pathStr.startsWith("/") ? pathStr : "/" + pathStr;

  if (!normalized.endsWith("/")) {
    normalized += "/";
  }

  return normalized;
}

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
export function globSearchFiles(
  files: Record<string, FileData>,
  pattern: string,
  path: string = "/",
): string {
  let normalizedPath: string;
  try {
    normalizedPath = validatePath(path);
  } catch {
    return "No files found";
  }

  const filtered = Object.fromEntries(
    Object.entries(files).filter(([fp]) => fp.startsWith(normalizedPath)),
  );

  // Respect standard glob semantics:
  // - Patterns without path separators (e.g., "*.py") match only in the current
  //   directory (non-recursive) relative to `path`.
  // - Use "**" explicitly for recursive matching.
  const effectivePattern = pattern;

  const matches: Array<[string, string]> = [];
  for (const [filePath, fileData] of Object.entries(filtered)) {
    let relative = filePath.substring(normalizedPath.length);
    if (relative.startsWith("/")) {
      relative = relative.substring(1);
    }
    if (!relative) {
      const parts = filePath.split("/");
      relative = parts[parts.length - 1] || "";
    }

    if (
      micromatch.isMatch(relative, effectivePattern, {
        dot: true,
        nobrace: false,
      })
    ) {
      matches.push([filePath, fileData.modified_at]);
    }
  }

  matches.sort((a, b) => b[1].localeCompare(a[1])); // Sort by modified_at descending

  if (matches.length === 0) {
    return "No files found";
  }

  return matches.map(([fp]) => fp).join("\n");
}

/**
 * Format grep search results based on output mode.
 *
 * @param results - Dictionary mapping file paths to list of [line_num, line_content] tuples
 * @param outputMode - Output format - "files_with_matches", "content", or "count"
 * @returns Formatted string output
 */
export function formatGrepResults(
  results: Record<string, Array<[number, string]>>,
  outputMode: "files_with_matches" | "content" | "count",
): string {
  if (outputMode === "files_with_matches") {
    return Object.keys(results).sort().join("\n");
  }
  if (outputMode === "count") {
    const lines: string[] = [];
    for (const filePath of Object.keys(results).sort()) {
      const count = results[filePath].length;
      lines.push(`${filePath}: ${count}`);
    }
    return lines.join("\n");
  }
  // content mode
  const lines: string[] = [];
  for (const filePath of Object.keys(results).sort()) {
    lines.push(`${filePath}:`);
    for (const [lineNum, line] of results[filePath]) {
      lines.push(`  ${lineNum}: ${line}`);
    }
  }
  return lines.join("\n");
}

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
export function grepSearchFiles(
  files: Record<string, FileData>,
  pattern: string,
  path: string | null = null,
  glob: string | null = null,
  outputMode: "files_with_matches" | "content" | "count" = "files_with_matches",
): string {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch (e: any) {
    return `Invalid regex pattern: ${e.message}`;
  }

  let normalizedPath: string;
  try {
    normalizedPath = validatePath(path);
  } catch {
    return "No matches found";
  }

  let filtered = Object.fromEntries(
    Object.entries(files).filter(([fp]) => fp.startsWith(normalizedPath)),
  );

  if (glob) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([fp]) =>
        micromatch.isMatch(basename(fp), glob, { dot: true, nobrace: false }),
      ),
    );
  }

  const results: Record<string, Array<[number, string]>> = {};
  for (const [filePath, fileData] of Object.entries(filtered)) {
    for (let i = 0; i < fileData.content.length; i++) {
      const line = fileData.content[i];
      const lineNum = i + 1;
      if (regex.test(line)) {
        if (!results[filePath]) {
          results[filePath] = [];
        }
        results[filePath].push([lineNum, line]);
      }
    }
  }

  if (Object.keys(results).length === 0) {
    return "No matches found";
  }
  return formatGrepResults(results, outputMode);
}

// -------- Structured helpers for composition --------

/**
 * Return structured grep matches from an in-memory files mapping.
 *
 * Returns a list of GrepMatch on success, or a string for invalid inputs
 * (e.g., invalid regex). We deliberately do not raise here to keep backends
 * non-throwing in tool contexts and preserve user-facing error messages.
 */
export function grepMatchesFromFiles(
  files: Record<string, FileData>,
  pattern: string,
  path: string | null = null,
  glob: string | null = null,
): GrepMatch[] | string {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch (e: any) {
    return `Invalid regex pattern: ${e.message}`;
  }

  let normalizedPath: string;
  try {
    normalizedPath = validatePath(path);
  } catch {
    return [];
  }

  let filtered = Object.fromEntries(
    Object.entries(files).filter(([fp]) => fp.startsWith(normalizedPath)),
  );

  if (glob) {
    filtered = Object.fromEntries(
      Object.entries(filtered).filter(([fp]) =>
        micromatch.isMatch(basename(fp), glob, { dot: true, nobrace: false }),
      ),
    );
  }

  const matches: GrepMatch[] = [];
  for (const [filePath, fileData] of Object.entries(filtered)) {
    for (let i = 0; i < fileData.content.length; i++) {
      const line = fileData.content[i];
      const lineNum = i + 1;
      if (regex.test(line)) {
        matches.push({ path: filePath, line: lineNum, text: line });
      }
    }
  }

  return matches;
}

/**
 * Group structured matches into the legacy dict form used by formatters.
 */
export function buildGrepResultsDict(
  matches: GrepMatch[],
): Record<string, Array<[number, string]>> {
  const grouped: Record<string, Array<[number, string]>> = {};
  for (const m of matches) {
    if (!grouped[m.path]) {
      grouped[m.path] = [];
    }
    grouped[m.path].push([m.line, m.text]);
  }
  return grouped;
}

/**
 * Format structured grep matches using existing formatting logic.
 */
export function formatGrepMatches(
  matches: GrepMatch[],
  outputMode: "files_with_matches" | "content" | "count",
): string {
  if (matches.length === 0) {
    return "No matches found";
  }
  return formatGrepResults(buildGrepResultsDict(matches), outputMode);
}
