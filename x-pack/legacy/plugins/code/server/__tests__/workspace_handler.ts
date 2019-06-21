/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import fs from 'fs';
import path from 'path';

import Git from '@elastic/nodegit';
import assert from 'assert';
import mkdirp from 'mkdirp';
import * as os from 'os';
import rimraf from 'rimraf';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';

import { LspRequest } from '../../model';
import { GitOperations } from '../git_operations';
import { WorkspaceHandler } from '../lsp/workspace_handler';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));
const workspaceDir = path.join(baseDir, 'workspace');
const repoDir = path.join(baseDir, 'repo');
const gitOps = new GitOperations(repoDir);

describe('workspace_handler tests', () => {
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
    mkdirp.sync(path.dirname(fullPath));
    fs.writeFileSync(fullPath, '');
    const strInUrl = fullPath
      .split(path.sep)
      .map(value => encodeURIComponent(value))
      .join('/');
    const uri = `file:///${strInUrl}`;
    return { repo, revision, file, uri };
  }

  it('file system url should be converted', async () => {
    const workspaceHandler = new WorkspaceHandler(
      gitOps,
      workspaceDir,
      // @ts-ignore
      null,
      new ConsoleLoggerFactory()
    );
    const { repo, revision, file, uri } = makeAFile(workspaceDir);
    const converted = handleResponseUri(workspaceHandler, uri);
    assert.strictEqual(converted, `git://${repo}/blob/${revision}/${file}`);
  });

  it('should support symbol link', async () => {
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
    assert.strictEqual(converted, `git://${repo}/blob/${revision}/${file}`);
  });

  it('should support spaces in workspace dir', async () => {
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
    assert.strictEqual(converted, `git://${repo}/blob/${revision}/${file}`);
  });

  it('should throw a error if url is invalid', async () => {
    const workspaceHandler = new WorkspaceHandler(
      gitOps,
      workspaceDir,
      // @ts-ignore
      null,
      new ConsoleLoggerFactory()
    );
    const invalidDir = path.join(baseDir, 'invalid_dir');
    const { uri } = makeAFile(invalidDir);
    assert.throws(() => handleResponseUri(workspaceHandler, uri));
  });

  async function prepareProject(repoPath: string) {
    mkdirp.sync(repoPath);
    const repo = await Git.Repository.init(repoPath, 0);
    const content = 'console.log("test")';
    const subFolder = 'src';
    fs.mkdirSync(path.join(repo.workdir(), subFolder));
    fs.writeFileSync(path.join(repo.workdir(), 'src/app.ts'), content, 'utf8');

    const index = await repo.refreshIndex();
    await index.addByPath('src/app.ts');
    index.write();
    const treeId = await index.writeTree();
    const committer = Git.Signature.create('tester', 'test@test.com', Date.now() / 1000, 60);
    const commit = await repo.createCommit(
      'HEAD',
      committer,
      committer,
      'commit for test',
      treeId,
      []
    );
    return { repo, commit };
  }

  it('should throw a error if file path is external', async () => {
    const workspaceHandler = new WorkspaceHandler(
      gitOps,
      workspaceDir,
      // @ts-ignore
      null,
      new ConsoleLoggerFactory()
    );
    const repoUri = 'github.com/microsoft/typescript-node-starter';
    await prepareProject(path.join(repoDir, repoUri));
    const externalFile = 'node_modules/abbrev/abbrev.js';
    const request: LspRequest = {
      method: 'textDocument/hover',
      params: {
        position: {
          line: 8,
          character: 23,
        },
        textDocument: {
          uri: `git://${repoUri}/blob/master/${externalFile}`,
        },
      },
    };
    assert.rejects(
      workspaceHandler.handleRequest(request),
      new Error('invalid file path in requests.')
    );
  });

  // @ts-ignore
  before(() => {
    mkdirp.sync(workspaceDir);
    mkdirp.sync(repoDir);
  });

  // @ts-ignore
  after(() => {
    rimraf.sync(baseDir);
  });
});
