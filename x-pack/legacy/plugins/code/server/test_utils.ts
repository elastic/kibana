/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import * as os from 'os';
import path from 'path';

import { AnyObject } from './lib/esqueue';
import { ServerOptions } from './server_options';

// TODO migrate other duplicate classes, functions

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
    enableGitCertCheck: false,
    gitProtocolWhitelist: ['ssh', 'https', 'git'],
  },
  repos: [],
  maxWorkspace: 5, // max workspace folder for each language server
  disableIndexScheduler: true, // Temp option to disable index scheduler.
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
