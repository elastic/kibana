/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fs from 'fs';
import path from 'path';

import * as os from 'os';
import rimraf from 'rimraf';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';

import { LspRequest } from '../../model';
import { GitOperations } from '../git_operations';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { WorkspaceHandler } from './workspace_handler';

const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));
const workspaceDir = path.join(baseDir, 'workspace');
const repoDir = path.join(baseDir, 'repo');
const gitOps = new GitOperations(repoDir);

function handleResponseUri(wh: WorkspaceHandler, uri: string) {
  const dummyRequest: LspRequest = {
    method: 'textDocument/edefinition',
    params: [],
  };
  const dummyResponse: ResponseMessage = {
    id: null,
    jsonrpc: '',
    result: [
      {
        location: {
          uri,
        },
      },
    ],
  };
  wh.handleResponse(dummyRequest, dummyResponse);
  return dummyResponse.result[0].location.uri;
}

function makeAFile(
  workspacePath: string = workspaceDir,
  repo = 'github.com/Microsoft/TypeScript-Node-Starter',
  revision = 'master',
  file = 'src/controllers/user.ts'
) {
  const fullPath = path.join(workspacePath, repo, '__randomString', revision, file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, '');
  const strInUrl = fullPath
    .split(path.sep)
    .map(value => encodeURIComponent(value))
    .join('/');
  const uri = `file:///${strInUrl}`;
  return { repo, revision, file, uri };
}

test('file system url should be converted', async () => {
  const workspaceHandler = new WorkspaceHandler(
    gitOps,
    workspaceDir,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const { repo, revision, file, uri } = makeAFile(workspaceDir);
  const converted = handleResponseUri(workspaceHandler, uri);
  expect(converted).toBe(`git://${repo}/blob/${revision}/${file}`);
});

test('should support symbol link', async () => {
  const symlinkToWorkspace = path.join(baseDir, 'linkWorkspace');
  fs.symlinkSync(workspaceDir, symlinkToWorkspace, 'dir');
  // @ts-ignore
  const workspaceHandler = new WorkspaceHandler(
    gitOps,
    symlinkToWorkspace,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );

  const { repo, revision, file, uri } = makeAFile(workspaceDir);
  const converted = handleResponseUri(workspaceHandler, uri);
  expect(converted).toBe(`git://${repo}/blob/${revision}/${file}`);
});

test('should support spaces in workspace dir', async () => {
  const workspaceHasSpaces = path.join(baseDir, 'work  space');
  const workspaceHandler = new WorkspaceHandler(
    gitOps,
    workspaceHasSpaces,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const { repo, revision, file, uri } = makeAFile(workspaceHasSpaces);
  const converted = handleResponseUri(workspaceHandler, uri);
  expect(converted).toBe(`git://${repo}/blob/${revision}/${file}`);
});

// FLAKY: https://github.com/elastic/kibana/issues/43655
test('should support case-insensitive workspace dir', async () => {
  const workspaceCaseInsensitive = path.join(baseDir, 'CamelCaseWorkSpace');
  // test only if it's case-insensitive
  const workspaceHandler = new WorkspaceHandler(
    gitOps,
    workspaceCaseInsensitive,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const { repo, revision, file, uri } = makeAFile(workspaceCaseInsensitive);
  // normally this test won't run on linux since its filesystem are case sensitive
  // So there is no 'CAMELCASEWORKSPACE' folder.
  if (fs.existsSync(workspaceCaseInsensitive.toUpperCase())) {
    const converted = handleResponseUri(workspaceHandler, uri.toLocaleLowerCase());
    // workspace dir should  be stripped
    expect(converted).toBe(
      `git://${repo.toLocaleLowerCase()}/blob/${revision.toLocaleLowerCase()}/${file.toLocaleLowerCase()}`
    );
  }
});

test('should throw a error if url is invalid', async () => {
  const workspaceHandler = new WorkspaceHandler(
    gitOps,
    workspaceDir,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const invalidDir = path.join(baseDir, 'invalid_dir');
  const { uri } = makeAFile(invalidDir);
  expect(() => handleResponseUri(workspaceHandler, uri)).toThrow();
});

beforeAll(() => {
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.mkdirSync(repoDir, { recursive: true });
});

afterAll(() => {
  rimraf.sync(baseDir);
});
