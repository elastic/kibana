/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Git from '@elastic/nodegit';
import assert from 'assert';
import { execSync } from 'child_process';
import fs from 'fs';
import * as mkdirp from 'mkdirp';
import path from 'path';
import rimraf from 'rimraf';
import { GitOperations } from '../git_operations';
import { createTestServerOption } from '../test_utils';

describe('git_operations', () => {
  it('get default branch from a non master repo', async () => {
    const repoUri = 'github.com/foo/bar';
    const repoDir = path.join(serverOptions.repoPath, repoUri);
    mkdirp.sync(repoDir);

    // create a non-master using git commands
    const shell = `
    git init
    git add 'run.sh'
    git commit -m 'init commit'
    git branch -m trunk
  `;
    fs.writeFileSync(path.join(repoDir, 'run.sh'), shell, 'utf-8');
    execSync('sh ./run.sh', {
      cwd: repoDir,
    });

    try {
      const g = new GitOperations(serverOptions.repoPath);
      const defaultBranch = await g.getDefaultBranch(repoUri);
      assert.strictEqual(defaultBranch, 'trunk');
    } finally {
      rimraf.sync(repoDir);
    }
  });

  async function prepareProject(repoPath: string) {
    mkdirp.sync(repoPath);
    const repo = await Git.Repository.init(repoPath, 0);
    const content = '';
    fs.writeFileSync(path.join(repo.workdir(), '1'), content, 'utf8');
    const subFolder = 'src';
    fs.mkdirSync(path.join(repo.workdir(), subFolder));
    fs.writeFileSync(path.join(repo.workdir(), 'src/2'), content, 'utf8');
    fs.writeFileSync(path.join(repo.workdir(), 'src/3'), content, 'utf8');

    const index = await repo.refreshIndex();
    await index.addByPath('1');
    await index.addByPath('src/2');
    await index.addByPath('src/3');
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
    // eslint-disable-next-line no-console
    console.log(`created commit ${commit.tostrS()}`);
    return repo;
  }

  // @ts-ignore
  before(async () => {
    await prepareProject(path.join(serverOptions.repoPath, repoUri));
  });
  const repoUri = 'github.com/test/test_repo';

  const serverOptions = createTestServerOption();

  it('can iterate a repo', async () => {
    const g = new GitOperations(serverOptions.repoPath);
    let count = 0;
    const iterator = await g.iterateRepo(repoUri, 'HEAD');
    for await (const value of iterator) {
      if (count === 0) {
        assert.strictEqual('1', value.name);
        assert.strictEqual('1', value.path);
      } else if (count === 1) {
        assert.strictEqual('2', value.name);
        assert.strictEqual('src/2', value.path);
      } else if (count === 2) {
        assert.strictEqual('3', value.name);
        assert.strictEqual('src/3', value.path);
      } else {
        assert.fail('this repo should contains exactly 2 files');
      }
      count++;
    }
    const totalFiles = await g.countRepoFiles(repoUri, 'HEAD');
    assert.strictEqual(count, 3, 'this repo should contains exactly 2 files');
    assert.strictEqual(totalFiles, 3, 'this repo should contains exactly 2 files');
  });

  it('get diff between arbitrary 2 revisions', async () => {
    function cloneProject(url: string, p: string) {
      return new Promise(resolve => {
        if (!fs.existsSync(p)) {
          rimraf(p, error => {
            Git.Clone.clone(url, p, {
              fetchOpts: {
                callbacks: {
                  certificateCheck: () => 0,
                },
              },
            }).then(repo => {
              resolve(repo);
            });
          });
        } else {
          resolve();
        }
      });
    }

    await cloneProject(
      'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      path.join(serverOptions.repoPath, 'github.com/Microsoft/TypeScript-Node-Starter')
    );

    const g = new GitOperations(serverOptions.repoPath);
    const d = await g.getDiff(
      'github.com/Microsoft/TypeScript-Node-Starter',
      '6206f643',
      '4779cb7e'
    );
    assert.equal(d.additions, 2);
    assert.equal(d.deletions, 4);
    assert.equal(d.files.length, 3);
    // @ts-ignore
  }).timeout(100000);
});
