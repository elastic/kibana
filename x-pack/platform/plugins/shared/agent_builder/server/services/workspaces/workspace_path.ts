/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createBadRequestError } from '@kbn/agent-builder-common';
import { MOUNT_POINTS } from '../execution/filesystem/mount_points';

/** Derived from the filesystem mount point so read validation can't drift from the write path. */
export const WORKSPACE_PREFIX = MOUNT_POINTS.workspace;

/**
 * Normalize a caller-supplied path and assert it stays within `/workspace`.
 *
 * `path.posix.normalize` collapses `..`/`.` segments, so any traversal that
 * escapes the workspace (e.g. `/workspace/../etc/passwd`) no longer starts with
 * the `/workspace/` prefix and is rejected. Returns the normalized absolute path
 * to use as the workspace file key.
 *
 * @throws BadRequest when the path resolves outside `/workspace`.
 */
export const resolveWorkspaceFilePath = (input: string): string => {
  const normalized = path.posix.normalize(input);
  if (!normalized.startsWith(`${WORKSPACE_PREFIX}/`)) {
    throw createBadRequestError(`Path must be within ${WORKSPACE_PREFIX}: ${input}`);
  }
  return normalized;
};
