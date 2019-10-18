/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import path from 'path';
import sinon from 'sinon';

import assert from 'assert';

import { simplegit } from '@elastic/simple-git/dist';
import { GitOperations } from '../git_operations';
import { RepositoryConfigReservedField, RepositoryGitStatusReservedField } from '../indexer/schema';
import { InstallManager } from '../lsp/install_manager';
import { LspService } from '../lsp/lsp_service';
import { RepositoryConfigController } from '../repository_config_controller';
import {
  createTestHapiServer,
  createTestServerOption,
  prepareProjectByCloning,
  prepareProjectByInit,
} from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const filename = 'hello.ts';
const packagejson = `
{
  "name": "master",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "dependencies": {},
  "devDependencies": {
      "typescript": "~3.3.3333"
  },
  "scripts": {
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}
`;
describe('lsp_service tests', () => {
  let firstCommitSha = '';
  let secondCommitSha = '';
  async function prepareProject(repoPath: string) {
    const { commits } = await prepareProjectByInit(repoPath, {
      'commit for test': {
        [filename]: "console.log('hello world');",
      },
      'commit2 for test': {
        'package.json': packagejson,
      },
    });

    firstCommitSha = commits[0];
    secondCommitSha = commits[1];
  }

  const serverOptions = createTestServerOption();
  const server = createTestHapiServer();
  const installManager = new InstallManager(server, serverOptions);
  const gitOps = new GitOperations(serverOptions.repoPath);

  function mockEsClient(): any {
    const api = {
      get(params: any) {
        return {
          _source: {
            [RepositoryGitStatusReservedField]: {
              cloneProgress: {
                isCloned: true,
              },
            },
            [RepositoryConfigReservedField]: {
              disableTypescript: false,
            },
          },
        };
      },
    };
    return api;
  }

  const repoUri = 'github.com/test/test_repo';
  const mockRndPath = '__random';

  // @ts-ignore
  before(async () => {
    const tmpRepo = path.join(serverOptions.repoPath, 'tmp');
    await prepareProject(tmpRepo);
    await prepareProjectByCloning(`file://${tmpRepo}`, path.join(serverOptions.repoPath, repoUri));
  });

  function comparePath(pathA: string, pathB: string) {
    const pa = fs.realpathSync(pathA);
    const pb = fs.realpathSync(pathB);
    return path.resolve(pa) === path.resolve(pb);
  }

  function mockLspService() {
    const esClient = mockEsClient();
    const service = new LspService(
      '127.0.0.1',
      serverOptions,
      gitOps,
      esClient,
      installManager,
      new ConsoleLoggerFactory(),
      new RepositoryConfigController(esClient)
    );
    // @ts-ignore
    service.workspaceHandler.randomPath = () => 'random';
    return service;
  }

  async function sendHoverRequest(lspservice: LspService, revision: string) {
    const method = 'textDocument/hover';

    const params = {
      textDocument: {
        uri: `git://${repoUri}/blob/${revision}/${filename}`,
      },
      position: {
        line: 0,
        character: 1,
      },
    };
    return await lspservice.sendRequest(method, params);
  }

  it('process a hover request', async () => {
    const lspservice = mockLspService();
    try {
      const workspaceHandler = lspservice.workspaceHandler;
      const wsSpy = sinon.spy(workspaceHandler, 'handleRequest');
      const controller = lspservice.controller;
      const ctrlSpy = sinon.spy(controller, 'handleRequest');

      const revision = 'master';

      const response = await sendHoverRequest(lspservice, revision);
      assert.ok(response);
      assert.ok(response.result.contents);

      wsSpy.restore();
      ctrlSpy.restore();

      const workspaceFolderExists = fs.existsSync(
        path.join(serverOptions.workspacePath, repoUri, mockRndPath, revision)
      );
      // workspace is opened
      assert.ok(workspaceFolderExists);

      const workspacePath = fs.realpathSync(
        path.resolve(serverOptions.workspacePath, repoUri, mockRndPath, revision)
      );
      // workspace handler is working, filled workspacePath
      sinon.assert.calledWith(
        ctrlSpy,
        sinon.match.has('workspacePath', sinon.match(value => comparePath(value, workspacePath)))
      );
      // uri is changed by workspace handler
      sinon.assert.calledWith(
        ctrlSpy,
        sinon.match.hasNested('params.textDocument.uri', `file://${workspacePath}/${filename}`)
      );
      return;
    } finally {
      await lspservice.shutdown();
    }
    // @ts-ignore
  }).timeout(30000);

  it('unload a workspace', async () => {
    const lspservice = mockLspService();
    try {
      const revision = 'master';
      // send a dummy request to open a workspace;
      const response = await sendHoverRequest(lspservice, revision);
      assert.ok(response);
      const workspacePath = path.resolve(
        serverOptions.workspacePath,
        repoUri,
        mockRndPath,
        revision
      );
      const workspaceFolderExists = fs.existsSync(workspacePath);
      // workspace is opened
      assert.ok(workspaceFolderExists);
      const controller = lspservice.controller;
      // @ts-ignore
      const languageServer = controller.languageServerMap.typescript[0];
      const realWorkspacePath = fs.realpathSync(workspacePath);

      // @ts-ignore
      const handler = await languageServer.languageServerHandlers[realWorkspacePath];
      const exitSpy = sinon.spy(handler, 'exit');
      const unloadSpy = sinon.spy(handler, 'unloadWorkspace');

      await lspservice.deleteWorkspace(repoUri);

      unloadSpy.restore();
      exitSpy.restore();

      sinon.assert.calledWith(unloadSpy, realWorkspacePath);
      // typescript language server for this workspace should be closed
      sinon.assert.calledOnce(exitSpy);
      // the workspace folder should be deleted
      const exists = fs.existsSync(realWorkspacePath);
      assert.strictEqual(exists, false);
      return;
    } finally {
      await lspservice.shutdown();
    }
    // @ts-ignore
  }).timeout(30000);

  it('should update if a worktree is not the newest', async () => {
    const lspservice = mockLspService();
    try {
      const revision = 'master';
      // send a dummy request to open a workspace;
      const response = await sendHoverRequest(lspservice, revision);
      assert.ok(response);
      const workspacePath = path.resolve(
        serverOptions.workspacePath,
        repoUri,
        mockRndPath,
        revision
      );
      const git = simplegit(workspacePath);
      const workspaceCommit = await git.revparse(['HEAD']);
      // workspace is newest now
      assert.strictEqual(workspaceCommit, secondCommitSha);
      // reset workspace to an older one
      await git.reset([firstCommitSha, '--hard']);
      assert.strictEqual(await git.revparse(['HEAD']), firstCommitSha);

      // send a request again;
      await sendHoverRequest(lspservice, revision);
      // workspace_handler should update workspace to the newest one
      assert.strictEqual(await git.revparse(['HEAD']), secondCommitSha);
      return;
    } finally {
      await lspservice.shutdown();
    }
    // @ts-ignore
  }).timeout(30000);
});
