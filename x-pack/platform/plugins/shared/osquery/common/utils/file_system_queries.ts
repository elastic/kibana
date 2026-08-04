/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeOsqueryStringLiteral } from './escape_osquery_string_literal';

/**
 * Operating-system families relevant to file-system root discovery. Derived from
 * the agent's `host.os.platform` / `host.os.family`.
 */
export type HostOsFamily = 'windows' | 'darwin' | 'linux';

/**
 * Builds the Osquery `file`-table query that lists the immediate children of a
 * directory. The path is ALWAYS routed through the string-literal escaper — the
 * Files tab never raw-concatenates a user-navigated path into SQL.
 *
 * Columns are kept minimal and stable: enough to render a tree node and decide
 * whether a row is a directory. `directory = '<path>'` lists one level only (no
 * trailing `%%` recursion) to keep each query bounded by the result window.
 */
export const buildDirectoryListingQuery = (path: string): string =>
  `SELECT path, filename, size, mtime, type FROM file WHERE directory = ${escapeOsqueryStringLiteral(
    path
  )}`;

/**
 * Builds the Osquery query that discovers the tree roots for a host:
 * - Windows: drive letters via `logical_drives` (e.g. `C:`).
 * - Linux/macOS: mount points via `mounts` (root `/` and additional volumes).
 */
export const buildRootDiscoveryQuery = (osFamily: HostOsFamily): string => {
  if (osFamily === 'windows') {
    return 'SELECT device_id AS path FROM logical_drives';
  }

  return 'SELECT path FROM mounts';
};

/**
 * Builds the Osquery `hash`-table query that computes md5, sha1, and sha256
 * checksums for a single file path. The path is routed through the string-literal
 * escaper — never raw-concatenated. Returns columns needed by the hashes flyout.
 */
export const buildHashQuery = (path: string): string =>
  `SELECT path, md5, sha1, sha256 FROM hash WHERE path = ${escapeOsqueryStringLiteral(path)}`;

/**
 * Normalizes an agent's reported OS platform/family into the {@link HostOsFamily}
 * we branch root discovery on. Defaults to `linux` for unknown unix-likes.
 */
export const resolveHostOsFamily = (platformOrFamily: string | undefined): HostOsFamily => {
  const value = (platformOrFamily ?? '').toLowerCase();
  if (value.includes('windows')) {
    return 'windows';
  }

  if (value.includes('darwin') || value.includes('macos') || value.includes('mac os')) {
    return 'darwin';
  }

  return 'linux';
};
