/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Git from '@elastic/nodegit';
import fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';

import assert from 'assert';
import { Server } from 'hapi';

import { GitOperations } from '../git_operations';
import { RepositoryConfigReservedField, RepositoryGitStatusReservedField } from '../indexer/schema';
import { InstallManager } from '../lsp/install_manager';
import { LspService } from '../lsp/lsp_service';
import { RepositoryConfigController } from '../repository_config_controller';
import { createTestServerOption } from '../test_utils';
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
    mkdirp.sync(repoPath);
    const repo = await Git.Repository.init(repoPath, 0);
    const helloContent = "console.log('hello world');";
    fs.writeFileSync(path.join(repo.workdir(), filename), helloContent, 'utf8');

    let index = await repo.refreshIndex();
    await index.addByPath(filename);
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
    firstCommitSha = commit.tostrS();
    fs.writeFileSync(path.join(repo.workdir(), 'package.json'), packagejson, 'utf8');
    index = await repo.refreshIndex();
    await index.addByPath('package.json');
    index.write();
    const treeId2 = await index.writeTree();
    const commit2 = await repo.createCommit(
      'HEAD',
      committer,
      committer,
      'commit2 for test',
      treeId2,
      [commit]
    );
    secondCommitSha = commit2.tostrS();

    return repo;
  }

  const serverOptions = createTestServerOption();
  const installManager = new InstallManager(new Server(), serverOptions);
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

  // @ts-ignore
  before(async () => {
    const tmpRepo = path.join(serverOptions.repoPath, 'tmp');
    await prepareProject(tmpRepo);
    await Git.Clone.clone(`file://${tmpRepo}`, path.join(serverOptions.repoPath, repoUri), {
      bare: 1,
      fetchOpts: {
        callbacks: {
          certificateCheck: () => 0,
        },
      },
    });
  });

  function comparePath(pathA: string, pathB: string) {
    const pa = fs.realpathSync(pathA);
    const pb = fs.realpathSync(pathB);
    return path.resolve(pa) === path.resolve(pb);
  }

  function mockLspService() {
    const esClient = mockEsClient();
    return new LspService(
      '127.0.0.1',
      serverOptions,
      gitOps,
      esClient,
      installManager,
      new ConsoleLoggerFactory(),
      new RepositoryConfigController(esClient)
    );
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
        path.join(serverOptions.workspacePath, repoUri, revision)
      );
      // workspace is opened
      assert.ok(workspaceFolderExists);

      const workspacePath = fs.realpathSync(
        path.resolve(serverOptions.workspacePath, repoUri, revision)
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
  }).timeout(10000);

  it('unload a workspace', async () => {
    const lspservice = mockLspService();
    try {
      const revision = 'master';
      // send a dummy request to open a workspace;
      const response = await sendHoverRequest(lspservice, revision);
      assert.ok(response);
      const workspacePath = path.resolve(serverOptions.workspacePath, repoUri, revision);
      const workspaceFolderExists = fs.existsSync(workspacePath);
      // workspace is opened
      assert.ok(workspaceFolderExists);
      const controller = lspservice.controller;
      // @ts-ignore
      const languageServer = controller.languageServerMap.typescript;
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
  }).timeout(10000);

  it('should work if a worktree exists', async () => {
    const lspservice = mockLspService();
    try {
      const revision = 'master';
      // send a dummy request to open a workspace;
      const response = await sendHoverRequest(lspservice, revision);
      assert.ok(response);
      const workspacePath = path.resolve(serverOptions.workspacePath, repoUri, revision);
      const workspaceFolderExists = fs.existsSync(workspacePath);
      // workspace is opened
      assert.ok(workspaceFolderExists);
      const bareRepoWorktree = path.join(
        serverOptions.repoPath,
        repoUri,
        'worktrees',
        `workspace-${revision}`
      );
      // worktree is exists
      const bareRepoWorktreeExists = fs.existsSync(bareRepoWorktree);
      assert.ok(bareRepoWorktreeExists);
      // delete the workspace folder but leave worktree
      rimraf.sync(workspacePath);
      // send a dummy request to open it again
      await sendHoverRequest(lspservice, revision);
      assert.ok(fs.existsSync(workspacePath));

      return;
    } finally {
      await lspservice.shutdown();
    }
    // @ts-ignore
  }).timeout(10000);

  it('should update if a worktree is not the newest', async () => {
    const lspservice = mockLspService();
    try {
      const revision = 'master';
      // send a dummy request to open a workspace;
      const response = await sendHoverRequest(lspservice, revision);
      assert.ok(response);
      const workspacePath = path.resolve(serverOptions.workspacePath, repoUri, revision);
      const workspaceRepo = await Git.Repository.open(workspacePath);
      // workspace is newest now
      assert.strictEqual((await workspaceRepo.getHeadCommit()).sha(), secondCommitSha);
      const firstCommit = await workspaceRepo.getCommit(firstCommitSha);
      // reset workspace to an older one
      // @ts-ignore
      await Git.Reset.reset(workspaceRepo, firstCommit, Git.Reset.TYPE.HARD, {});
      assert.strictEqual((await workspaceRepo.getHeadCommit()).sha(), firstCommitSha);

      // send a request again;
      await sendHoverRequest(lspservice, revision);
      // workspace_handler should update workspace to the newest one
      assert.strictEqual((await workspaceRepo.getHeadCommit()).sha(), secondCommitSha);
      return;
    } finally {
      await lspservice.shutdown();
    }
    // @ts-ignore
  }).timeout(10000);
});
