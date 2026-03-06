/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZipArchive } from './open_zip_archive';

/**
 * Creates a path-scoped view of a ZipArchive.
 *
 * All entry paths are rebased relative to the given prefix.
 * For example, if the underlying archive has entries like
 * `repo-main/plugins/my-plugin/skills/SKILL.md` and the prefix
 * is `repo-main/plugins/my-plugin/`, then `getEntryPaths()` will
 * return `skills/SKILL.md`.
 *
 * This is useful for GitHub archive downloads where the zip
 * contains a top-level `{repo}-{ref}/` directory and the plugin
 * may be nested inside it.
 */
export const createScopedArchive = (archive: ZipArchive, prefix: string): ZipArchive => {
  const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return new ScopedZipArchive(archive, normalizedPrefix);
};

/**
 * Detects the single top-level directory in a zip archive.
 *
 * GitHub archive zips always contain a single root folder
 * like `{repo}-{ref}/`. This function finds it by inspecting
 * the entry paths.
 *
 * Returns the prefix including trailing slash (e.g. `claude-code-main/`).
 */
export const detectArchiveRootPrefix = (archive: ZipArchive): string => {
  const entries = archive.getEntryPaths();
  if (entries.length === 0) {
    return '';
  }

  const firstSegment = entries[0].split('/')[0];
  const prefix = `${firstSegment}/`;

  const allMatch = entries.every((entry) => entry.startsWith(prefix));
  if (!allMatch) {
    return '';
  }

  return prefix;
};

class ScopedZipArchive implements ZipArchive {
  private readonly inner: ZipArchive;
  private readonly prefix: string;

  constructor(inner: ZipArchive, prefix: string) {
    this.inner = inner;
    this.prefix = prefix;
  }

  hasEntry(entryPath: string): boolean {
    return this.inner.hasEntry(this.prefix + entryPath);
  }

  getEntryPaths(): string[] {
    return this.inner
      .getEntryPaths()
      .filter((p) => p.startsWith(this.prefix) && p.length > this.prefix.length)
      .map((p) => p.substring(this.prefix.length));
  }

  getEntryContent(entryPath: string): Promise<Buffer> {
    return this.inner.getEntryContent(this.prefix + entryPath);
  }

  close(): void {
    this.inner.close();
  }
}
