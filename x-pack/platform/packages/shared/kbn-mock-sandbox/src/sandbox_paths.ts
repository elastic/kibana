/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { posix } from 'path';

// Mirrors cmd/sandbox-service/path.go in elastic/sandbox-service.
export const DEFAULT_DIRECTORY = '/workspace';
const ALLOWED_ROOTS = ['/tmp', '/workspace', '/home/appuser'] as const;

const hasTraversalComponent = (path: string): boolean => path.split('/').includes('..');

const isUnderAllowedRoot = (absolutePath: string): boolean =>
  ALLOWED_ROOTS.some((root) => absolutePath === root || absolutePath.startsWith(`${root}/`));

/**
 * Resolves a client path under an allowed root (/tmp, /workspace, /home/appuser), the way the
 * real sandbox pod does. Relative paths are placed under /workspace. Returns `undefined` for
 * paths the real sandbox rejects.
 */
export const resolveSandboxPath = (rawPath: string): string | undefined => {
  const trimmed = rawPath.trim();
  if (!trimmed || hasTraversalComponent(trimmed)) {
    return undefined;
  }
  let absolutePath: string;
  if (trimmed.startsWith('/')) {
    absolutePath = posix.normalize(trimmed);
  } else {
    const relative = posix.normalize(trimmed);
    if (relative === '.' || relative === './') {
      return undefined;
    }
    absolutePath = posix.join(DEFAULT_DIRECTORY, relative);
  }
  absolutePath = absolutePath.length > 1 ? absolutePath.replace(/\/+$/, '') : absolutePath;
  return isUnderAllowedRoot(absolutePath) ? absolutePath : undefined;
};
