/**
 * Normalizes a path by:
 * - Ensuring it starts with /
 * - Removing trailing slashes (except for root)
 * - Collapsing multiple slashes
 * - Resolving . and .. segments
 */
export declare function normalizePath(path: string): string;
/**
 * Returns the directory portion of a path.
 * e.g., dirname('/a/b/c.txt') => '/a/b'
 */
export declare function dirname(path: string): string;
/**
 * Returns the filename portion of a path (last segment).
 * e.g., basename('/a/b/c.txt') => 'c.txt'
 */
export declare function basename(path: string): string;
/**
 * Joins path segments together and normalizes the result.
 * e.g., join('/a', 'b', 'c.txt') => '/a/b/c.txt'
 */
export declare function joinPath(...parts: string[]): string;
/**
 * Splits a path into its segments (excluding empty strings).
 * e.g., getPathSegments('/a/b/c') => ['a', 'b', 'c']
 */
export declare function getPathSegments(path: string): string[];
/**
 * Checks if a path is the root path.
 */
export declare function isRootPath(path: string): boolean;
/**
 * Gets all ancestor directory paths for a given path.
 * e.g., getAncestorPaths('/a/b/c/file.txt') => ['/', '/a', '/a/b', '/a/b/c']
 */
export declare function getAncestorPaths(path: string): string[];
/**
 * Gets the parent path of a given path.
 * Returns '/' for paths directly under root.
 * Returns undefined for the root path itself.
 */
export declare function getParentPath(path: string): string | undefined;
