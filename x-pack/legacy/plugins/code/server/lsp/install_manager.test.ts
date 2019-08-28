/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import fs from 'fs';
import { Server } from 'hapi';
import os from 'os';
import path from 'path';
import rimraf from 'rimraf';

import { LanguageServers } from './language_servers';
import { InstallManager } from './install_manager';
import { ServerOptions } from '../server_options';
import { LanguageServerStatus } from '../../common/language_server';
import { InstallationType } from '../../common/installation';
import { ServerFacade } from '../..';

const LANG_SERVER_NAME = 'Java';
const langSrvDef = LanguageServers.find(l => l.name === LANG_SERVER_NAME)!;

const fakeTestDir = path.join(os.tmpdir(), 'foo-');

const options: ServerOptions = {} as ServerOptions;

const server: ServerFacade = new Server();
server.config = () => {
  return {
    get(key: string): any {
      if (key === 'pkg.version') {
        return '8.0.0';
      }
    },
    has(key: string): boolean {
      return key === 'pkg.version';
    },
  };
};

const manager = new InstallManager(server, options);

beforeAll(() => {
  fs.mkdirSync(fakeTestDir);
});

afterAll(() => {
  rimraf.sync(fakeTestDir);
});

test('install language server by plugin', async () => {
  langSrvDef.installationType = InstallationType.Plugin;
  expect(manager.status(langSrvDef)).toBe(LanguageServerStatus.NOT_INSTALLED);
  const testDir = path.join(fakeTestDir, 'test_plugin');
  fs.mkdirSync(testDir);
  const pluginName = langSrvDef.installationPluginName as string;
  // @ts-ignore
  server.plugins = {
    [pluginName]: {
      install: {
        path: testDir,
      },
    },
  };
  expect(manager.status(langSrvDef)).toBe(LanguageServerStatus.READY);
  expect(manager.installationPath(langSrvDef)).toBe(testDir);
});
