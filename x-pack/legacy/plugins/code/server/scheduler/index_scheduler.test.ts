/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import sinon from 'sinon';

import {
  CloneProgress,
  CloneWorkerProgress,
  Repository,
  WorkerProgress,
  WorkerReservedProgress,
} from '../../model';
import {
  RepositoryGitStatusReservedField,
  RepositoryLspIndexStatusReservedField,
  RepositoryReservedField,
} from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { IndexWorker } from '../queue/index_worker';
import { ServerOptions } from '../server_options';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { IndexScheduler } from './index_scheduler';

const INDEX_FREQUENCY_MS: number = 1000;
const INDEX_REPO_FREQUENCY_MS: number = 8000;
const serverOpts = {
  indexFrequencyMs: INDEX_FREQUENCY_MS,
  indexRepoFrequencyMs: INDEX_REPO_FREQUENCY_MS,
};
const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {
  get: emptyAsyncFunc,
  search: emptyAsyncFunc,
  update: emptyAsyncFunc,
};
const indexWorker = {
  enqueueJob: emptyAsyncFunc,
};

const createSearchSpy = (nextIndexTimestamp: number): sinon.SinonSpy => {
  const repo: Repository = {
    uri: 'github.com/elastic/code',
    url: 'https://github.com/elastic/code.git',
    org: 'elastic',
    name: 'code',
    revision: 'master',
    nextIndexTimestamp: moment()
      .add(nextIndexTimestamp, 'ms')
      .toDate(),
  };
  return sinon.fake.returns(
    Promise.resolve({
      hits: {
        hits: [
          {
            _source: {
              [RepositoryReservedField]: repo,
            },
          },
        ],
      },
    })
  );
};

const createGetStub = (
  gitProgress: number,
  lspIndexProgress: number,
  lspIndexRevision: string
): sinon.SinonStub => {
  const cloneStatus: CloneWorkerProgress = {
    uri: 'github.com/elastic/code',
    progress: gitProgress,
    timestamp: new Date(),
    cloneProgress: {
      isCloned: true,
    } as CloneProgress,
  };
  const lspIndexStatus: WorkerProgress = {
    uri: 'github.com/elastic/code',
    progress: lspIndexProgress,
    timestamp: new Date(),
    revision: lspIndexRevision,
  };
  const stub = sinon.stub();
  stub.onFirstCall().returns(
    Promise.resolve({
      _source: {
        [RepositoryGitStatusReservedField]: cloneStatus,
      },
    })
  );
  stub.onSecondCall().returns(
    Promise.resolve({
      _source: {
        [RepositoryLspIndexStatusReservedField]: lspIndexStatus,
      },
    })
  );
  return stub;
};

afterEach(() => {
  sinon.restore();
});

test('Next job should not execute when scheduled index time is not current.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the IndexWorker spy.
  const enqueueJobSpy = sinon.spy(indexWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(INDEX_FREQUENCY_MS + 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getSpy = sinon.spy();
  esClient.get = getSpy;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      // Expect no update on anything regarding the index task scheduling.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      expect(getSpy.notCalled).toBeTruthy();
      expect(updateSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const indexScheduler = new IndexScheduler(
    (indexWorker as any) as IndexWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  indexScheduler.start();

  // Roll the clock to the time when the first scheduled index task
  // is executed.
  clock.tick(INDEX_FREQUENCY_MS);
});

test('Next job should not execute when repo is still in clone.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the IndexWorker spy.
  const enqueueJobSpy = sinon.spy(indexWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(INDEX_FREQUENCY_MS - 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getStub = createGetStub(50, WorkerReservedProgress.COMPLETED, 'newrevision');
  esClient.get = getStub;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories and
      // the get stub to be called to pull out git status.
      expect(searchSpy.calledOnce).toBeTruthy();
      expect(getStub.calledOnce).toBeTruthy();
      // Expect no update on anything regarding the index task scheduling.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      expect(updateSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const indexScheduler = new IndexScheduler(
    (indexWorker as any) as IndexWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  indexScheduler.start();

  // Roll the clock to the time when the first scheduled index task
  // is executed.
  clock.tick(INDEX_FREQUENCY_MS);
});

test('Next job should not execute when repo is still in the preivous index job.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the IndexWorker spy.
  const enqueueJobSpy = sinon.spy(indexWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(INDEX_FREQUENCY_MS - 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getStub = createGetStub(WorkerReservedProgress.COMPLETED, 50, 'newrevision');
  esClient.get = getStub;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      // Expect the get stub to be called twice to pull out git status and
      // lsp index status respectively.
      expect(getStub.calledTwice).toBeTruthy();
      // Expect no update on anything regarding the index task scheduling.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      expect(updateSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const indexScheduler = new IndexScheduler(
    (indexWorker as any) as IndexWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  indexScheduler.start();

  // Roll the clock to the time when the first scheduled index task
  // is executed.
  clock.tick(INDEX_FREQUENCY_MS);
});

test('Next job should not execute when repo revision did not change.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the IndexWorker spy.
  const enqueueJobSpy = sinon.spy(indexWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(INDEX_FREQUENCY_MS - 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getStub = createGetStub(
    WorkerReservedProgress.COMPLETED,
    WorkerReservedProgress.COMPLETED,
    'master'
  );
  esClient.get = getStub;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      // Expect the get stub to be called twice to pull out git status and
      // lsp index status respectively.
      expect(getStub.calledTwice).toBeTruthy();
      // Expect no update on anything regarding the index task scheduling.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      expect(updateSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const indexScheduler = new IndexScheduler(
    (indexWorker as any) as IndexWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  indexScheduler.start();

  // Roll the clock to the time when the first scheduled index task
  // is executed.
  clock.tick(INDEX_FREQUENCY_MS);
});

test('Next job should execute.', done => {
  const clock = sinon.useFakeTimers();

  // Setup the IndexWorker spy.
  const enqueueJobSpy = sinon.spy(indexWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy(INDEX_FREQUENCY_MS - 1);
  esClient.search = searchSpy;

  // Set up the update and get spies of esClient
  const getStub = createGetStub(
    WorkerReservedProgress.COMPLETED,
    WorkerReservedProgress.COMPLETED,
    'newrevision'
  );
  esClient.get = getStub;
  const updateSpy = sinon.spy();
  esClient.update = updateSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      // Expect the get stub to be called twice to pull out git status and
      // lsp index status respectively.
      expect(getStub.calledTwice).toBeTruthy();
      // Expect the update stub to be called to update next schedule timestamp.
      expect(updateSpy.calledOnce).toBeTruthy();
      // Expect the enqueue job stub to be called to issue the index job.
      expect(enqueueJobSpy.calledOnce).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  // Start the scheduler.
  const indexScheduler = new IndexScheduler(
    (indexWorker as any) as IndexWorker,
    serverOpts as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  indexScheduler.start();

  // Roll the clock to the time when the first scheduled index task
  // is executed.
  clock.tick(INDEX_FREQUENCY_MS);
});
