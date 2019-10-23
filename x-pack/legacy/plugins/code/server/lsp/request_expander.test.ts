/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import del from 'del';
import sinon from 'sinon';
import { pathToFileURL } from 'url';

import { ServerOptions } from '../server_options';
import { LanguageServerProxy } from './proxy';
import { RequestExpander, WorkspaceUnloadedError } from './request_expander';
import { ConsoleLogger } from '../utils/console_logger';

// @ts-ignore
const options: ServerOptions = {
  workspacePath: '/tmp/test/workspace',
};
beforeEach(async () => {
  sinon.reset();
  if (!fs.existsSync(options.workspacePath)) {
    fs.mkdirSync(options.workspacePath, { recursive: true });
  }
});

afterEach(async () => {
  await del(options.workspacePath, { force: true });
});

function createMockProxy(initDelay: number = 0, requestDelay: number = 0) {
  // @ts-ignore
  const proxyStub = sinon.createStubInstance(LanguageServerProxy, {
    handleRequest: sinon.stub().callsFake(() => {
      if (requestDelay > 0) {
        const start = Date.now();
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ result: { start, end: Date.now() } });
          }, requestDelay);
        });
      } else {
        return sinon.stub().resolvesArg(0);
      }
    }),
    initialize: sinon.stub().callsFake(
      () =>
        new Promise(resolve => {
          proxyStub.initialized = true;
          if (initDelay > 0) {
            setTimeout(() => {
              resolve();
            }, initDelay);
          } else {
            resolve();
          }
        })
    ),
  });
  return proxyStub;
}

const log = new ConsoleLogger();

test('be able to open multiple workspace', async () => {
  const proxyStub = createMockProxy();
  const expander = new RequestExpander(proxyStub, true, 2, options, {}, log);
  const request1 = {
    method: 'request1',
    params: [],
    workspacePath: '/tmp/test/workspace/1',
  };

  const request2 = {
    method: 'request2',
    params: [],
    workspacePath: '/tmp/test/workspace/2',
  };
  fs.mkdirSync(request1.workspacePath, { recursive: true });
  fs.mkdirSync(request2.workspacePath, { recursive: true });
  await expander.handleRequest(request1);
  await expander.handleRequest(request2);
  expect(proxyStub.initialize.called);
  expect(
    proxyStub.initialize.calledOnceWith({}, [
      {
        name: request1.workspacePath,
        uri: pathToFileURL(request1.workspacePath).href,
      },
    ])
  ).toBeTruthy();
  expect(
    proxyStub.handleRequest.calledWith({
      method: 'workspace/didChangeWorkspaceFolders',
      params: {
        event: {
          added: [
            {
              name: request2.workspacePath,
              uri: pathToFileURL(request2.workspacePath).href,
            },
          ],
          removed: [],
        },
      },
      isNotification: true,
    })
  ).toBeTruthy();
});

test('be able to swap workspace', async () => {
  const proxyStub = createMockProxy();
  const expander = new RequestExpander(proxyStub, true, 1, options, {}, log);
  const request1 = {
    method: 'request1',
    params: [],
    workspacePath: '/tmp/test/workspace/1',
  };
  const request2 = {
    method: 'request2',
    params: [],
    workspacePath: '/tmp/test/workspace/2',
  };
  fs.mkdirSync(request1.workspacePath, { recursive: true });
  fs.mkdirSync(request2.workspacePath, { recursive: true });
  await expander.handleRequest(request1);
  await expander.handleRequest(request2);
  expect(proxyStub.initialize.called);
  expect(
    proxyStub.handleRequest.calledWith({
      method: 'workspace/didChangeWorkspaceFolders',
      params: {
        event: {
          added: [
            {
              name: request2.workspacePath,
              uri: pathToFileURL(request2.workspacePath).href,
            },
          ],
          removed: [
            {
              name: request1.workspacePath,
              uri: pathToFileURL(request1.workspacePath).href,
            },
          ],
        },
      },
      isNotification: true,
    })
  ).toBeTruthy();
});

test('requests should be cancelled if workspace is unloaded', async () => {
  // @ts-ignore

  const clock = sinon.useFakeTimers();
  const proxyStub = createMockProxy(300);
  const expander = new RequestExpander(proxyStub, true, 1, options, {}, log);
  const workspace1 = '/tmp/test/workspace/1';
  const request = {
    method: 'request1',
    params: [],
    workspacePath: workspace1,
  };
  fs.mkdirSync(workspace1, { recursive: true });
  const promise1 = expander.handleRequest(request);
  const promise2 = expander.handleRequest(request);
  setTimeout(() => expander.unloadWorkspace(workspace1), 1);
  clock.tick(100);

  process.nextTick(() => clock.runAll());
  await expect(promise1).rejects.toEqual(WorkspaceUnloadedError);
  await expect(promise2).rejects.toEqual(WorkspaceUnloadedError);

  clock.restore();
});
