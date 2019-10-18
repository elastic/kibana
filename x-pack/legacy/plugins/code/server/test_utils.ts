/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { Server } from 'hapi';
import * as os from 'os';
import path from 'path';

import { simplegit } from '@elastic/simple-git/dist';
import rimraf from 'rimraf';
import { AnyObject } from './lib/esqueue';
import { ServerOptions } from './server_options';
import { ServerFacade } from '..';

export function prepareProjectByCloning(url: string, p: string) {
  return new Promise(resolve => {
    if (!fs.existsSync(p)) {
      rimraf(p, error => {
        fs.mkdirSync(p, { recursive: true });
        const git = simplegit(p);
        git.clone(url, p, ['--bare']).then(resolve);
      });
    } else {
      resolve();
    }
  });
}

export async function prepareProjectByInit(
  repoPath: string,
  commits: { [commitMessage: string]: { [path: string]: string } }
) {
  if (!fs.existsSync(repoPath)) fs.mkdirSync(repoPath, { recursive: true });
  const git = simplegit(repoPath);
  await git.init();
  await git.addConfig('user.email', 'test@test.com');
  await git.addConfig('user.name', 'tester');
  const results: string[] = [];
  for (const [message, commit] of Object.entries(commits)) {
    const files = [];
    for (const [file, content] of Object.entries(commit)) {
      const filePath = path.join(repoPath, file);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf8');
      files.push(file);
      await git.add(file);
    }
    await git.commit(message, files);
    const c = await git.revparse(['HEAD']);
    results.push(c);
  }
  return { git, commits: results };
}

export const emptyAsyncFunc = async (_: AnyObject): Promise<any> => {
  Promise.resolve({});
};

const TEST_OPTIONS = {
  enabled: true,
  queueIndex: '.code_internal-worker-queue',
  queueTimeoutMs: 60 * 60 * 1000, // 1 hour by default
  updateFreqencyMs: 5 * 60 * 1000, // 5 minutes by default
  indexFrequencyMs: 24 * 60 * 60 * 1000, // 1 day by default
  lsp: {
    requestTimeoutMs: 5 * 60, // timeout a request over 30s
    detach: false,
    verbose: false,
  },
  security: {
    enableMavenImport: true,
    enableGradleImport: true,
    installNodeDependency: true,
    gitProtocolWhitelist: ['ssh', 'https', 'git'],
    enableJavaSecurityManager: true,
  },
  disk: {
    thresholdEnabled: true,
    watermarkLow: '80%',
  },
  clustering: {
    enabled: false,
    codeNodes: [],
  },
  repos: [],
  maxWorkspace: 5, // max workspace folder for each language server
};

export function createTestServerOption() {
  const tmpDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));

  const config = {
    get(key: string) {
      if (key === 'path.data') {
        return tmpDataPath;
      }
    },
  };

  return new ServerOptions(TEST_OPTIONS, config);
}

export function createTestHapiServer() {
  const server: ServerFacade = new Server();
  // @ts-ignore
  server.config = () => {
    return {
      get(key: string) {
        if (key === 'env.dev') return false;
        else return true;
      },
    };
  };
  return server;
}
