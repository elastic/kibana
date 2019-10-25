/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import assert from 'assert';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import del from 'del';
import { GitOperations } from '../git_operations';
import { createTestServerOption } from '../test_utils';
import { prepareProjectByCloning as cloneProject, prepareProjectByInit } from '../test_utils';

describe('git_operations', () => {
  it('get default branch from a non master repo', async () => {
    const repoUri = 'github.com/foo/bar';
    const repoDir = path.join(serverOptions.repoPath, repoUri);
    fs.mkdirSync(repoDir, { recursive: true });

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
      const headRevision = await g.getHeadRevision(repoUri);
      const headCommit = await g.getCommitInfo(repoUri, 'HEAD');
      assert.strictEqual(headRevision, headCommit!.id);
    } finally {
      del.sync(repoDir);
    }
  });

  async function prepareProject(repoPath: string) {
    fs.mkdirSync(repoPath, { recursive: true });
    const workDir = path.join(serverOptions.workspacePath, repoUri);
    const { git, commits } = await prepareProjectByInit(workDir, {
      'commit for test': {
        '1': '',
        'src/2': '',
        'src/3': '',
      },
    });
    // eslint-disable-next-line no-console
    console.log(`created commit ${commits[0]}`);
    await git.clone(workDir, repoPath, ['--bare']);
  }

  // @ts-ignore
  before(async function() {
    // @ts-ignore
    this.timeout(200000);
    await prepareProject(path.join(serverOptions.repoPath, repoUri));
    await cloneProject(
      'https://github.com/elastic/TypeScript-Node-Starter.git',
      path.join(serverOptions.repoPath, 'github.com/elastic/TypeScript-Node-Starter')
    );
  });
  const repoUri = 'github.com/test/test_repo';

  const serverOptions = createTestServerOption();

  it('can iterate a repo', async () => {
    const g = new GitOperations(serverOptions.repoPath);
    let count = 0;
    const iterator = await g.iterateRepo(repoUri, 'HEAD');
    for await (const value of iterator) {
      if (count === 0) {
        assert.strictEqual('1', value.path);
      } else if (count === 1) {
        assert.strictEqual('src/2', value.path);
      } else if (count === 2) {
        assert.strictEqual('src/3', value.path);
      } else {
        assert.fail('this repo should contains exactly 3 files');
      }
      count++;
    }
    const totalFiles = await g.countRepoFiles(repoUri, 'HEAD');
    assert.strictEqual(count, 3, 'this repo should contains exactly 3 files');
    assert.strictEqual(totalFiles, 3, 'this repo should contains exactly 3 files');
  });

  it('can resolve branches', async () => {
    const g = new GitOperations(serverOptions.repoPath);
    const c = await g.getCommitOr404('github.com/elastic/TypeScript-Node-Starter', 'master');
    assert.strictEqual(c.id, '261557d657fdfddf78119d15d38b1f6a7be005ed');
    const c1 = await g.getCommitOr404('github.com/elastic/TypeScript-Node-Starter', 'VS');
    assert.strictEqual(c1.id, 'ba73782df210e0a7744ac9b623d58081a1801738');
    // @ts-ignore
  }).timeout(100000);

  it('get diff between arbitrary 2 revisions', async () => {
    const g = new GitOperations(serverOptions.repoPath);
    const d = await g.getDiff('github.com/elastic/TypeScript-Node-Starter', '6206f643', '4779cb7e');
    assert.equal(d.additions, 2);
    assert.equal(d.deletions, 4);
    assert.equal(d.files.length, 3);
    // @ts-ignore
  }).timeout(100000);
});
