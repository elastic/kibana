/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { WorkerReservedProgress } from '../../model';
import { GitOperations } from '../git_operations';
import { IndexerFactory } from '../indexer';
import { RepositoryLspIndexStatusReservedField } from '../indexer/schema';
import { CancellationToken, EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { CancellationSerivce } from './cancellation_service';
import { IndexWorker } from './index_worker';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esQueue = {};

afterEach(() => {
  sinon.restore();
});

test('Execute index job.', async () => {
  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const registerIndexJobTokenSpy = sinon.spy();
  const cancellationService = {
    cancelIndexJob: emptyAsyncFunc,
    registerIndexJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.registerIndexJobToken = registerIndexJobTokenSpy;

  // Setup EsClient
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryLspIndexStatusReservedField]: {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          progress: WorkerReservedProgress.COMPLETED,
          timestamp: new Date(),
          revision: 'abcdefg',
        },
      },
    })
  );
  const esClient = {
    get: emptyAsyncFunc,
  };
  esClient.get = getSpy;

  // Setup IndexerFactory
  const cancelSpy = sinon.spy();
  const startSpy = sinon.fake.returns(new Map());
  const indexer = {
    cancel: emptyAsyncFunc,
    start: emptyAsyncFunc,
  };
  indexer.cancel = cancelSpy;
  indexer.start = startSpy;
  const createSpy = sinon.fake.returns(indexer);
  const indexerFactory = {
    create: emptyAsyncFunc,
  };
  indexerFactory.create = createSpy;

  const cToken = new CancellationToken();

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [(indexerFactory as any) as IndexerFactory],
    {} as GitOperations,
    (cancellationService as any) as CancellationSerivce
  );

  await indexWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    cancellationToken: cToken,
    timestamp: 0,
  });

  expect(cancelIndexJobSpy.calledOnce).toBeTruthy();
  expect(getSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledOnce).toBeTruthy();
  expect(startSpy.calledOnce).toBeTruthy();
  expect(cancelSpy.notCalled).toBeTruthy();
});

test('Execute index job and then cancel.', async () => {
  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const registerIndexJobTokenSpy = sinon.spy();
  const cancellationService = {
    cancelIndexJob: emptyAsyncFunc,
    registerIndexJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.registerIndexJobToken = registerIndexJobTokenSpy;

  // Setup EsClient
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryLspIndexStatusReservedField]: {
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
          progress: WorkerReservedProgress.COMPLETED,
          timestamp: new Date(),
          revision: 'abcdefg',
        },
      },
    })
  );
  const esClient = {
    get: emptyAsyncFunc,
  };
  esClient.get = getSpy;

  // Setup IndexerFactory
  const cancelSpy = sinon.spy();
  const startSpy = sinon.fake.returns(new Map());
  const indexer = {
    cancel: emptyAsyncFunc,
    start: emptyAsyncFunc,
  };
  indexer.cancel = cancelSpy;
  indexer.start = startSpy;
  const createSpy = sinon.fake.returns(indexer);
  const indexerFactory = {
    create: emptyAsyncFunc,
  };
  indexerFactory.create = createSpy;

  const cToken = new CancellationToken();

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [(indexerFactory as any) as IndexerFactory],
    {} as GitOperations,
    (cancellationService as any) as CancellationSerivce
  );

  await indexWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    cancellationToken: cToken,
    timestamp: 0,
  });

  // Cancel the index job.
  cToken.cancel();

  expect(cancelIndexJobSpy.calledOnce).toBeTruthy();
  expect(getSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledOnce).toBeTruthy();
  expect(startSpy.calledOnce).toBeTruthy();
  // Then the the cancel function of the indexer should be called.
  expect(cancelSpy.calledOnce).toBeTruthy();
});

test('Index job skipped/deduplicated if revision matches', async () => {
  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const registerIndexJobTokenSpy = sinon.spy();
  const cancellationService = {
    cancelIndexJob: emptyAsyncFunc,
    registerIndexJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.registerIndexJobToken = registerIndexJobTokenSpy;

  // Setup EsClient
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryLspIndexStatusReservedField]: {
          uri: 'github.com/elastic/kibana',
          progress: 50,
          timestamp: new Date(),
          revision: 'abcdefg',
          indexProgress: {},
        },
      },
    })
  );
  const esClient = {
    get: emptyAsyncFunc,
  };
  esClient.get = getSpy;

  // Setup IndexerFactory
  const cancelSpy = sinon.spy();
  const startSpy = sinon.fake.returns(new Map());
  const indexer = {
    cancel: emptyAsyncFunc,
    start: emptyAsyncFunc,
  };
  indexer.cancel = cancelSpy;
  indexer.start = startSpy;
  const createSpy = sinon.fake.returns(indexer);
  const indexerFactory = {
    create: emptyAsyncFunc,
  };
  indexerFactory.create = createSpy;

  const cToken = new CancellationToken();

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [(indexerFactory as any) as IndexerFactory],
    {} as GitOperations,
    (cancellationService as any) as CancellationSerivce
  );

  await indexWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
      revision: 'abcdefg',
    },
    options: {},
    cancellationToken: cToken,
    timestamp: 0,
  });

  expect(getSpy.calledOnce).toBeTruthy();
  expect(cancelIndexJobSpy.notCalled).toBeTruthy();
  expect(createSpy.notCalled).toBeTruthy();
  expect(startSpy.notCalled).toBeTruthy();
  expect(cancelSpy.notCalled).toBeTruthy();
});

test('Index job continue if revision matches and checkpoint found', async () => {
  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const registerIndexJobTokenSpy = sinon.spy();
  const cancellationService = {
    cancelIndexJob: emptyAsyncFunc,
    registerIndexJobToken: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.registerIndexJobToken = registerIndexJobTokenSpy;

  // Setup EsClient
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryLspIndexStatusReservedField]: {
          uri: 'github.com/elastic/kibana',
          progress: 50,
          timestamp: new Date(),
          revision: 'abcdefg',
          indexProgress: {
            checkpoint: {
              repoUri: 'github.com/elastic/kibana',
              filePath: 'foo/bar.js',
              revision: 'abcdefg',
            },
          },
        },
      },
    })
  );
  const esClient = {
    get: emptyAsyncFunc,
  };
  esClient.get = getSpy;

  // Setup IndexerFactory
  const cancelSpy = sinon.spy();
  const startSpy = sinon.fake.returns(new Map());
  const indexer = {
    cancel: emptyAsyncFunc,
    start: emptyAsyncFunc,
  };
  indexer.cancel = cancelSpy;
  indexer.start = startSpy;
  const createSpy = sinon.fake.returns(indexer);
  const indexerFactory = {
    create: emptyAsyncFunc,
  };
  indexerFactory.create = createSpy;

  const cToken = new CancellationToken();

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [(indexerFactory as any) as IndexerFactory],
    {} as GitOperations,
    (cancellationService as any) as CancellationSerivce
  );

  await indexWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
      revision: 'abcdefg',
    },
    options: {},
    cancellationToken: cToken,
    timestamp: 0,
  });

  expect(getSpy.calledOnce).toBeTruthy();
  // the rest of the index worker logic after the checkpoint handling
  // should be executed.
  expect(cancelIndexJobSpy.calledOnce).toBeTruthy();
  expect(createSpy.calledOnce).toBeTruthy();
  expect(startSpy.calledOnce).toBeTruthy();
  expect(cancelSpy.notCalled).toBeTruthy();
});

test('On index job enqueued.', async () => {
  // Setup EsClient
  const indexSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    index: emptyAsyncFunc,
  };
  esClient.index = indexSpy;

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [],
    {} as GitOperations,
    {} as CancellationSerivce
  );

  await indexWorker.onJobEnqueued({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    timestamp: 0,
  });

  expect(indexSpy.calledOnce).toBeTruthy();
});

test('On index job completed.', async () => {
  // Setup EsClient
  const updateSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    update: emptyAsyncFunc,
  };
  esClient.update = updateSpy;

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [],
    {} as GitOperations,
    {} as CancellationSerivce
  );

  await indexWorker.onJobCompleted(
    {
      payload: {
        uri: 'github.com/elastic/kibana',
      },
      options: {},
      timestamp: 0,
    },
    {
      uri: 'github.com/elastic/kibana',
      revision: 'master',
      stats: new Map(),
    }
  );

  expect(updateSpy.calledTwice).toBeTruthy();
});

test('On index job completed because of cancellation.', async () => {
  // Setup EsClient
  const updateSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    update: emptyAsyncFunc,
  };
  esClient.update = updateSpy;

  const indexWorker = new IndexWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    [],
    {} as GitOperations,
    {} as CancellationSerivce
  );

  await indexWorker.onJobCompleted(
    {
      payload: {
        uri: 'github.com/elastic/kibana',
      },
      options: {},
      timestamp: 0,
    },
    {
      uri: 'github.com/elastic/kibana',
      revision: 'master',
      stats: new Map(),
      // Index job is done because of cancellation.
      cancelled: true,
    }
  );

  // The elasticsearch update won't be called for the sake of
  // cancellation.
  expect(updateSpy.notCalled).toBeTruthy();
});
