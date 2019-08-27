/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import sinon from 'sinon';

import { Repository, WorkerReservedProgress, WorkerProgress } from '../../model';
import { RepositoryDeleteStatusReservedField, RepositoryReservedField } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { CloneWorker } from '../queue/clone_worker';
import { ServerOptions } from '../server_options';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { CloneScheduler } from './clone_scheduler';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);
const esClient = {
  get: emptyAsyncFunc,
  search: emptyAsyncFunc,
  update: emptyAsyncFunc,
};
const cloneWorker = {
  enqueueJob: emptyAsyncFunc,
};

const createSearchSpy = (): sinon.SinonSpy => {
  const repo: Repository = {
    uri: 'github.com/elastic/code',
    url: 'https://github.com/elastic/code.git',
    org: 'elastic',
    name: 'code',
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

const createGetSpy = (inDelete: boolean): sinon.SinonStub => {
  const deleteStatus: WorkerProgress = {
    uri: 'github.com/elastic/code',
    progress: WorkerReservedProgress.INIT,
    timestamp: new Date(),
  };
  const stub = sinon.stub();
  if (inDelete) {
    stub.returns(
      Promise.resolve({
        _source: {
          [RepositoryDeleteStatusReservedField]: deleteStatus,
        },
      })
    );
  } else {
    stub.throwsException('Failed to get delete status');
  }

  return stub;
};

beforeEach(() => {
  fs.mkdirSync('/tmp/github.com/elastic/code', { recursive: true });
});

afterEach(() => {
  fs.rmdirSync('/tmp/github.com/elastic/code');
  sinon.restore();
});

test('Reschedule clone job if local repository folder does not exist', async done => {
  // Setup the clone worker spy.
  const enqueueJobSpy = sinon.spy(cloneWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy();
  esClient.search = searchSpy;

  // Set up esClient
  const getSpy = createGetSpy(false);
  esClient.get = getSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      expect(getSpy.calledOnce).toBeTruthy();
      // Expect a clone job has been issued to the queue.
      expect(enqueueJobSpy.calledOnce).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  const cloneScheduler = new CloneScheduler(
    (cloneWorker as any) as CloneWorker,
    {
      repoPath: '/tmp/does-not-exist/code',
    } as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  await cloneScheduler.schedule();
});

test('Do not reschedule clone job if local repository folder exist', async done => {
  // Setup the clone worker spy.
  const enqueueJobSpy = sinon.spy(cloneWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy();
  esClient.search = searchSpy;

  // Set up esClient
  const getSpy = createGetSpy(false);
  esClient.get = getSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      expect(getSpy.calledOnce).toBeTruthy();
      // Expect no clone job submitted to the queue.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  const cloneScheduler = new CloneScheduler(
    (cloneWorker as any) as CloneWorker,
    {
      repoPath: '/tmp',
    } as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  await cloneScheduler.schedule();
});

test('Do not reschedule clone job if the repository is in deletion', async done => {
  // Setup the clone worker spy.
  const enqueueJobSpy = sinon.spy(cloneWorker, 'enqueueJob');

  // Setup the search stub to mock loading all repositories from ES.
  const searchSpy = createSearchSpy();
  esClient.search = searchSpy;

  // Set up esClient
  const getSpy = createGetSpy(true);
  esClient.get = getSpy;

  const onScheduleFinished = () => {
    try {
      // Expect the search stub to be called to pull all repositories.
      expect(searchSpy.calledOnce).toBeTruthy();
      expect(getSpy.calledOnce).toBeTruthy();
      // Expect no clone job submitted to the queue.
      expect(enqueueJobSpy.notCalled).toBeTruthy();
      done();
    } catch (err) {
      done.fail(err);
    }
  };

  const cloneScheduler = new CloneScheduler(
    (cloneWorker as any) as CloneWorker,
    {
      repoPath: '/tmp/does-not-exist/code',
    } as ServerOptions,
    esClient as EsClient,
    log,
    onScheduleFinished
  );
  await cloneScheduler.schedule();
});
