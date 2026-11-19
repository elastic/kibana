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
  const gitBranch = tryGitCommand('git rev-parse --abbrev-ref HEAD');
  const gitCommit = tryGitCommand('git rev-parse HEAD');

  const branch =
    gitBranch && gitBranch !== 'HEAD' ? gitBranch : process.env.BUILDKITE_BRANCH ?? null;
  const bkCommit = process.env.BUILDKITE_COMMIT;
  const commitSha = (bkCommit && bkCommit !== 'HEAD' ? bkCommit : null) ?? gitCommit ?? null;

  return { branch, commitSha };
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
