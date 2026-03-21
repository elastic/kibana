import type { IFileStore } from '@kbn/agent-builder-server/runner/filestore';
export interface BuildFolderTreeOptions {
    /**
     * The starting path for the tree. Defaults to '/'.
     */
    path?: string;
    /**
     * Maximum depth to traverse. Defaults to 5.
     */
    maxDepth?: number;
    /**
     * Maximum number of files to show per folder before collapsing to "[X more files]".
     * Defaults to 3.
     */
    maxFilesPerFolder?: number;
    /**
     * Number of whitespace characters to add at the beginning of each line.
     * Defaults to 0.
     */
    initialIndent?: number;
}
/**
 * Builds a text representation of the folder structure from the filesystem store.
 *
 * For each folder:
 * - Lists subdirectories (sorted alphabetically)
 * - Shows up to `maxFilesPerFolder` file names (sorted alphabetically)
 * - If there are more files, shows a `[X more files]` entry
 *
 * @example
 * ```
 * /
 * ├── folder_a/
 * │   ├── subfolder_1/
 * │   │   ├── file1.txt
 * │   │   └── file2.txt
 * │   ├── doc.md
 * │   ├── index.ts
 * │   ├── utils.ts
 * │   └── [2 more files]
 * └── folder_b/
 *     └── readme.md
 * ```
 */
export declare function buildFolderTree(fsStore: IFileStore, options?: BuildFolderTreeOptions): Promise<string>;
