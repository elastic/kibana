/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync } from 'child_process';

export interface GitMetadata {
  branch: string | null;
  commitSha: string | null;
}

export function getGitMetadata(): GitMetadata {
  const branch = tryGitCommand('git rev-parse --abbrev-ref HEAD');
  const commitSha = tryGitCommand('git rev-parse HEAD');

  return {
    branch: branch || null,
    commitSha: commitSha || null,
  };
}

function tryGitCommand(command: string): string | null {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}
