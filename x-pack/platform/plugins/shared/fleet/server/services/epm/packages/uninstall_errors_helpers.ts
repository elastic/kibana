/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FailedAttempt } from '../../../types';

const MAX_ATTEMPTS_TO_KEEP = 5;

export function updateUninstallFailedAttempts({
  error,
  createdAt,
  latestAttempts = [],
}: {
  error: Error;
  createdAt: string;
  latestAttempts?: FailedAttempt[];
}): FailedAttempt[] {
  return [
    {
      created_at: createdAt,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    },
    ...latestAttempts,
  ].slice(0, MAX_ATTEMPTS_TO_KEEP);
}
