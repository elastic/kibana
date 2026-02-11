/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import type { ToolingLog } from '@kbn/tooling-log';
import type { TaskConfig } from '../types';

/**
 * Fetches Security Labs content from GitHub repository or uses local path.
 * Returns the path to the content directory.
 */
export const fetchContent = async ({
  config,
  log,
}: {
  config: TaskConfig;
  log: ToolingLog;
}): Promise<string> => {
  // If local content path is provided, use it directly
  if (config.localContentPath) {
    log.info(`Using local content path: ${config.localContentPath}`);

    // Verify the path exists
    try {
      await Fs.access(config.localContentPath);
    } catch {
      throw new Error(`Local content path does not exist: ${config.localContentPath}`);
    }

    return config.localContentPath;
  }

  // Otherwise, fetch from GitHub
  log.info(`Fetching content from GitHub: ${config.githubRepoUrl}`);

  const destFolder = Path.join(config.buildFolder, 'content');
  await Fs.mkdir(destFolder, { recursive: true });

  // TODO: Implement GitHub content fetching
  // This is a stub implementation - actual implementation would:
  // 1. Clone or download the repository archive
  // 2. Extract markdown files
  // 3. Return the path to the extracted content

  throw new Error(
    `GitHub fetching not yet implemented. Please use --localContentPath to provide local content. ` +
      `GitHub repo URL configured: ${config.githubRepoUrl}`
  );

  // Future implementation:
  // const response = await fetch(`${config.githubRepoUrl}/archive/main.zip`, {
  //   headers: config.githubToken ? { Authorization: `token ${config.githubToken}` } : {},
  // });
  // ... extract and return path
};
