/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import { ServerOptions } from '../server_options';
import { createTestServerOption } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { TYPESCRIPT } from './language_servers';
import { TypescriptServerLauncher } from './ts_launcher';

jest.setTimeout(10000);

// @ts-ignore
const options: ServerOptions = createTestServerOption();

beforeAll(async () => {
  if (!fs.existsSync(options.workspacePath)) {
    fs.mkdirSync(options.workspacePath, { recursive: true });
    fs.mkdirSync(options.jdtWorkspacePath, { recursive: true });
  }
});

function delay(seconds: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), seconds * 1000);
  });
}

test.skip('typescript language server could be shutdown', async () => {
  const tsLauncher = new TypescriptServerLauncher('localhost', options, new ConsoleLoggerFactory());
  const proxy = await tsLauncher.launch(true, 1, TYPESCRIPT.embedPath!);
  await proxy.initialize(options.workspacePath);
  await delay(2);
  expect(tsLauncher.running).toBeTruthy();
  await proxy.exit();
  await delay(2);
  expect(tsLauncher.running).toBeFalsy();
});
