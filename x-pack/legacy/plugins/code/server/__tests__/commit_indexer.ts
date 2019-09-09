/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Git, { CloneOptions } from '@elastic/nodegit';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';

import { GitOperations } from '../git_operations';
import { CommitIndexRequest, WorkerReservedProgress } from '../../model';
import { CommitIndexer } from '../indexer/commit_indexer';
import { RepositoryGitStatusReservedField } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { createTestServerOption, emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {
  bulk: emptyAsyncFunc,
  get: emptyAsyncFunc,
  deleteByQuery: emptyAsyncFunc,
  indices: {
    existsAlias: emptyAsyncFunc,
    create: emptyAsyncFunc,
    putAlias: emptyAsyncFunc,
  },
};

function prepareProject(url: string, p: string) {
  const opts: CloneOptions = {
    bare: 1,
    fetchOpts: {
      callbacks: {
        certificateCheck: () => 0,
      },
    },
  };

  return new Promise(resolve => {
    if (!fs.existsSync(p)) {
      rimraf(p, error => {
        Git.Clone.clone(url, p, opts).then(repo => {
          resolve(repo);
        });
      });
    } else {
      resolve();
    }
  });
}

const repoUri = 'github.com/elastic/TypeScript-Node-Starter';

const serverOptions = createTestServerOption();
const gitOps = new GitOperations(serverOptions.repoPath);

function cleanWorkspace() {
  return new Promise(resolve => {
    rimraf(serverOptions.workspacePath, resolve);
  });
}

function setupEsClientSpy() {
  // Mock a git status of the repo indicating the the repo is fully cloned already.
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryGitStatusReservedField]: {
          uri: repoUri,
          progress: WorkerReservedProgress.COMPLETED,
          timestamp: new Date(),
          cloneProgress: {
            isCloned: true,
          },
        },
      },
    })
  );
  const existsAliasSpy = sinon.fake.returns(false);
  const createSpy = sinon.spy();
  const putAliasSpy = sinon.spy();
  const deleteByQuerySpy = sinon.spy();
  const bulkSpy = sinon.spy();
  esClient.bulk = bulkSpy;
  esClient.indices.existsAlias = existsAliasSpy;
  esClient.indices.create = createSpy;
  esClient.indices.putAlias = putAliasSpy;
  esClient.get = getSpy;
  esClient.deleteByQuery = deleteByQuerySpy;
  return {
    getSpy,
    existsAliasSpy,
    createSpy,
    putAliasSpy,
    deleteByQuerySpy,
    bulkSpy,
  };
}

describe('Commit indexer unit tests', function(this: any) {
  this.timeout(20000);

  // @ts-ignore
  before(async () => {
    return new Promise(resolve => {
      rimraf(serverOptions.repoPath, resolve);
    });
  });

  beforeEach(async function() {
    // @ts-ignore
    this.timeout(200000);
    return await prepareProject(
      `https://${repoUri}.git`,
      path.join(serverOptions.repoPath, repoUri)
    );
  });
  // @ts-ignore
  after(() => {
    return cleanWorkspace();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Normal COMMIT index process.', async () => {
    // Setup the esClient spies
    const {
      existsAliasSpy,
      createSpy,
      putAliasSpy,
      deleteByQuerySpy,
      bulkSpy,
    } = setupEsClientSpy();

    const indexer = new CommitIndexer(repoUri, 'master', gitOps, esClient as EsClient, log);
    await indexer.start();

    assert.strictEqual(deleteByQuerySpy.callCount, 1);
    assert.strictEqual(existsAliasSpy.callCount, 1);
    assert.strictEqual(createSpy.callCount, 1);
    assert.strictEqual(putAliasSpy.callCount, 1);

    assert.strictEqual(bulkSpy.callCount, 1);
    let total = 0;
    for (let i = 0; i < bulkSpy.callCount; i++) {
      total += bulkSpy.getCall(i).args[0].body.length;
    }
    assert.strictEqual(total, 147 * 2);
    // @ts-ignore
  }).timeout(20000);

  it('Cancel COMMIT index process.', async () => {
    // Setup the esClient spies
    const {
      existsAliasSpy,
      createSpy,
      putAliasSpy,
      deleteByQuerySpy,
      bulkSpy,
    } = setupEsClientSpy();

    const indexer = new CommitIndexer(repoUri, 'master', gitOps, esClient as EsClient, log);
    // Cancel the indexer before start.
    indexer.cancel();
    await indexer.start();

    assert.strictEqual(deleteByQuerySpy.callCount, 1);
    assert.strictEqual(existsAliasSpy.callCount, 1);
    assert.strictEqual(createSpy.callCount, 1);
    assert.strictEqual(putAliasSpy.callCount, 1);

    // Because the indexer is cancelled already in the begining. 0 doc should be
    // indexed and thus bulk won't be called.
    assert.ok(bulkSpy.notCalled);
  });

  it('Index continues from a checkpoint', async () => {
    // Setup the esClient spies
    const {
      existsAliasSpy,
      createSpy,
      putAliasSpy,
      deleteByQuerySpy,
      bulkSpy,
    } = setupEsClientSpy();

    const indexer = new CommitIndexer(repoUri, 'master', gitOps, esClient as EsClient, log);
    // Apply a checkpoint in here.
    await indexer.start(undefined, ({
      repoUri: '',
      revision: 'master',
      commit: {
        // The direct parent of the HEAD
        id: '46971a8454761f1a11d8fde4d96ff8d29bc4e754',
      },
    } as any) as CommitIndexRequest);

    // Expect EsClient deleteByQuery called 0 times for repository cleaning while
    // dealing with repository checkpoint.
    assert.strictEqual(deleteByQuerySpy.callCount, 0);

    // Ditto for index and alias creation
    assert.strictEqual(existsAliasSpy.callCount, 0);
    assert.strictEqual(createSpy.callCount, 0);
    assert.strictEqual(putAliasSpy.callCount, 0);
    assert.strictEqual(bulkSpy.callCount, 1);
    let total = 0;
    for (let i = 0; i < bulkSpy.callCount; i++) {
      total += bulkSpy.getCall(i).args[0].body.length;
    }
    assert.strictEqual(total, 146 * 2);
    // @ts-ignore
  }).timeout(20000);
});
