/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FileEntry,
  IFileStore,
  LsEntry,
  DirEntryWithChildren,
} from '@kbn/agent-builder-server/runner/filestore';

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
export async function buildFolderTree(
  fsStore: IFileStore,
  options: BuildFolderTreeOptions = {}
): Promise<string> {
  const { path = '/', maxDepth = 5, maxFilesPerFolder = 3, initialIndent = 0 } = options;

  // Get the tree structure using ls with depth
  const entries = await fsStore.ls(path, { depth: maxDepth });

  // Build the text representation
  const indent = ' '.repeat(initialIndent);
  const lines: string[] = [`${indent}${path}`];
  buildTreeLines(entries, indent, lines, maxFilesPerFolder);

  return lines.join('\n');
}

function buildTreeLines(
  entries: LsEntry[],
  prefix: string,
  lines: string[],
  maxFilesPerFolder: number
): void {
  // Separate directories and files
  const dirs = entries.filter((e): e is DirEntryWithChildren => e.type === 'dir');
  const files = entries.filter((e): e is FileEntry => e.type === 'file');

  // Sort directories alphabetically by their basename
  dirs.sort((a, b) => {
    const nameA = getBasename(a.path);
    const nameB = getBasename(b.path);
    return nameA.localeCompare(nameB);
  });

  // Sort files alphabetically by their basename
  files.sort((a, b) => {
    const nameA = getBasename(a.path);
    const nameB = getBasename(b.path);
    return nameA.localeCompare(nameB);
  });

  // Determine which files to show and if we need a "more files" entry
  const filesToShow = files.slice(0, maxFilesPerFolder);
  const remainingFilesCount = files.length - filesToShow.length;
  const hasMoreFiles = remainingFilesCount > 0;

  // Calculate total items to display (dirs + shown files + optional "more files" entry)
  const totalItems = dirs.length + filesToShow.length + (hasMoreFiles ? 1 : 0);

  let itemIndex = 0;

  // Render directories
  dirs.forEach((dir) => {
    itemIndex++;
    const isLastItem = itemIndex === totalItems;
    const connector = isLastItem ? '└── ' : '├── ';
    const childPrefix = isLastItem ? '    ' : '│   ';

    const dirName = getBasename(dir.path);
    lines.push(`${prefix}${connector}${dirName}/`);

    // Recursively process children
    if (dir.children && dir.children.length > 0) {
      buildTreeLines(dir.children, prefix + childPrefix, lines, maxFilesPerFolder);
    }
  });

  // Render individual files
  filesToShow.forEach((file) => {
    itemIndex++;
    const isLastItem = itemIndex === totalItems;
    const connector = isLastItem ? '└── ' : '├── ';

    const fileName = getBasename(file.path);
    lines.push(`${prefix}${connector}${fileName}`);
  });

  // Render "more files" entry if needed
  if (hasMoreFiles) {
    const moreText =
      remainingFilesCount === 1 ? '[1 more file]' : `[${remainingFilesCount} more files]`;
    lines.push(`${prefix}└── ${moreText}`);
  }
}

function getBasename(path: string): string {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}
