/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lt } from 'semver';

import type { InstallFailedAttempt } from '../../../types';

const MAX_ATTEMPTS_TO_KEEP = 5;

export function clearLatestFailedAttempts(
  installedVersion: string,
  latestAttempts: InstallFailedAttempt[] = []
) {
  return latestAttempts.filter((attempt) => lt(installedVersion, attempt.target_version));
}

export function addErrorToLatestFailedAttempts({
  error,
  createdAt,
  targetVersion,
  latestAttempts = [],
}: {
  createdAt: string;
  targetVersion: string;
  error: Error;
  latestAttempts?: InstallFailedAttempt[];
}): InstallFailedAttempt[] {
  return [
    {
      created_at: createdAt,
      target_version: targetVersion,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    },
    ...latestAttempts,
  ].slice(0, MAX_ATTEMPTS_TO_KEEP);
}
