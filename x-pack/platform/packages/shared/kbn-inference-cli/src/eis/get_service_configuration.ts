/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { promises as Fs } from 'fs';
import Path from 'path';
import os from 'os';
import simpleGit from 'simple-git';
import { load } from 'js-yaml';

class GitCheckoutError extends Error {
  constructor(cause: Error) {
    super(`Failed to checkout repository. Make sure you've authenticated to Git`, { cause });
  }
}

async function getFiles(files: string[]): Promise<string[]> {
  // Create a temporary directory
  const tmpDir = await Fs.mkdtemp(Path.join(os.tmpdir(), 'serverless-gitops-'));
  const git = simpleGit(tmpDir);

  // Initialize an empty repository and add remote
  await git.init();
  await git.raw(['config', 'core.sparseCheckout', 'true']);

  const sparseCheckoutPath = Path.join(tmpDir, '.git', 'info', 'sparse-checkout');
  await Fs.writeFile(sparseCheckoutPath, files.join('\n'), 'utf-8');

  async function pull() {
    return await git.pull('origin', 'main', { '--depth': '1' });
  }

  await git.addRemote('origin', `git@github.com:elastic/serverless-gitops.git`);

  await pull()
    .catch(async () => {
      await git.remote(['set-url', 'origin', 'https://github.com/elastic/serverless-gitops.git']);
      await pull();
    })
    .catch((error) => {
      throw new GitCheckoutError(error);
    });

  const fileContents = await Promise.all(
    files.map(async (filePath) => {
      return await Fs.readFile(Path.join(tmpDir, filePath), 'utf-8');
    })
  );

  await Fs.rm(tmpDir, { recursive: true, force: true });

  return fileContents;
}

export async function getServiceConfigurationFromYaml<T>(
  serviceName: string,
  environment: string = 'qa'
): Promise<{
  version: string;
  config: T;
}> {
  const [configFile, versionsFile] = await getFiles([
    `services/${serviceName}/values/${environment}/default.yaml`,
    `services/${serviceName}/versions.yaml`,
  ]);

  const config = load(configFile) as T;
  const versions = load(versionsFile) as {
    services: {
      [x: string]: {
        versions: Record<string, string>;
      };
    };
  };

  const versionMap = Object.values(versions.services)[0].versions;

  const versionKey = Object.keys(versionMap).find((key) => key.startsWith(environment));

  if (!versionKey) {
    throw new Error(
      `No version found for environment ${environment}, available versions ${Object.keys(
        versionMap
      ).join(', ')}`
    );
  }

  return {
    config,
    version: versionMap[versionKey],
  };
}
