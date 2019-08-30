/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import simplegit from '@elastic/simple-git/promise';
import { createTestServerOption } from '../test_utils';
import path from 'path';
import mkdirp from 'mkdirp';
import fs from 'fs';
import { LsTree } from './lstree';
import { CatFile } from './catfile';

const serverOptions = createTestServerOption();
const repoDir = path.join(serverOptions.repoPath, 'test_repo');

beforeAll(async () => {
  mkdirp.sync(repoDir);
  const git = simplegit(repoDir);
  await git.init(false);
  const content = 'dummy';
  await fs.promises.writeFile(path.join(repoDir, 'dummy1.txt'), content);
  await fs.promises.writeFile(path.join(repoDir, 'dummy2.txt'), content);
  await git.add(['dummy1.txt', 'dummy2.txt']);
  await git.commit('first commit');
});

test('lstree can list repo', async () => {
  const lsTree = new LsTree(repoDir, 'HEAD', '.', {
    recursive: true,
    blobOnly: true,
  });
  expect(await lsTree.count()).toBe(2);
});

test('catfile can read blob content', async () => {
  const lsTree = new LsTree(repoDir, 'HEAD', './dummy1.txt', {
    recursive: true,
    blobOnly: true,
  });
  const items = await lsTree.items();
  const id = items[0].id;
  const catFile = new CatFile(repoDir);
  const content = await catFile.getBlob(id);
  expect(content).toBe('dummy');
});
