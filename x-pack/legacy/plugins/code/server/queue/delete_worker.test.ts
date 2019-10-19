/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { WorkerReservedProgress } from '../../model';
import { RepositoryIndexStatusReservedField } from '../indexer/schema';
import { EsClient, Esqueue } from '../lib/esqueue';
import { GitOperations } from '../git_operations';
import { Logger } from '../log';
import { LspService } from '../lsp/lsp_service';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { CancellationSerivce } from './cancellation_service';
import { DeleteWorker } from './delete_worker';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esQueue = {};

afterEach(() => {
  sinon.restore();
});

test('Execute delete job.', async () => {
  // Setup RepositoryService
  const removeSpy = sinon.fake.returns(Promise.resolve());
  const repoService = {
    remove: emptyAsyncFunc,
  };
  repoService.remove = removeSpy;
  const repoServiceFactory = {
    newInstance: (): void => {
      return;
    },
  };
  const newInstanceSpy = sinon.fake.returns(repoService);
  repoServiceFactory.newInstance = newInstanceSpy;

  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const cancelCloneJobSpy = sinon.spy();
  const cancelUpdateJobSpy = sinon.spy();
  const cancellationService = {
    cancelCloneJob: emptyAsyncFunc,
    cancelUpdateJob: emptyAsyncFunc,
    cancelIndexJob: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.cancelCloneJob = cancelCloneJobSpy;
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;

  // Setup EsClient
  const deleteSpy = sinon.fake.returns(Promise.resolve());
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryIndexStatusReservedField]: {
          uri: 'github.com/elastic/kibana',
          progress: WorkerReservedProgress.COMPLETED,
          timestamp: new Date(),
          revision: 'abcdefg',
        },
      },
    })
  );
  const esClient = {
    indices: {
      delete: emptyAsyncFunc,
    },
    get: emptyAsyncFunc,
  };
  esClient.indices.delete = deleteSpy;
  esClient.get = getSpy;

  // Setup LspService
  const deleteWorkspaceSpy = sinon.fake.returns(Promise.resolve());
  const lspService = {
    deleteWorkspace: emptyAsyncFunc,
  };
  lspService.deleteWorkspace = deleteWorkspaceSpy;

  // Setup GitOperations
  const cleanRepoSpy = sinon.spy();
  const gitOps = {
    cleanRepo: cleanRepoSpy,
  };

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {} as ServerOptions,
    (gitOps as any) as GitOperations,
    (cancellationService as any) as CancellationSerivce,
    (lspService as any) as LspService,
    (repoServiceFactory as any) as RepositoryServiceFactory
  );

  await deleteWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    timestamp: 0,
  });

  expect(cancelIndexJobSpy.calledOnce).toBeTruthy();
  expect(cancelCloneJobSpy.calledOnce).toBeTruthy();
  expect(cancelUpdateJobSpy.calledOnce).toBeTruthy();

  expect(newInstanceSpy.calledOnce).toBeTruthy();
  expect(removeSpy.calledOnce).toBeTruthy();
  expect(deleteSpy.calledThrice).toBeTruthy();

  expect(deleteWorkspaceSpy.calledOnce).toBeTruthy();
});

test('On delete job uri does not exist.', async () => {
  // Setup RepositoryService
  const removeSpy = sinon.fake.returns(Promise.resolve());
  const repoService = {
    remove: emptyAsyncFunc,
  };
  repoService.remove = removeSpy;
  const repoServiceFactory = {
    newInstance: (): void => {
      return;
    },
  };
  const newInstanceSpy = sinon.fake.returns(repoService);
  repoServiceFactory.newInstance = newInstanceSpy;

  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const cancelCloneJobSpy = sinon.spy();
  const cancelUpdateJobSpy = sinon.spy();
  const cancellationService = {
    cancelCloneJob: emptyAsyncFunc,
    cancelUpdateJob: emptyAsyncFunc,
    cancelIndexJob: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.cancelCloneJob = cancelCloneJobSpy;
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;

  // Setup EsClient
  const deleteSpy = sinon.fake.returns(Promise.resolve());
  const getSpy = sinon.fake.returns(Promise.reject(new Error('ES does not find the document')));
  const esClient = {
    indices: {
      delete: emptyAsyncFunc,
    },
    get: emptyAsyncFunc,
  };
  esClient.indices.delete = deleteSpy;
  esClient.get = getSpy;

  // Setup LspService
  const deleteWorkspaceSpy = sinon.fake.returns(Promise.resolve());
  const lspService = {
    deleteWorkspace: emptyAsyncFunc,
  };
  lspService.deleteWorkspace = deleteWorkspaceSpy;

  // Setup GitOperations
  const cleanRepoSpy = sinon.spy();
  const gitOps = {
    cleanRepo: cleanRepoSpy,
  };

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {},
    } as ServerOptions,
    (gitOps as any) as GitOperations,
    (cancellationService as any) as CancellationSerivce,
    (lspService as any) as LspService,
    (repoServiceFactory as any) as RepositoryServiceFactory
  );

  const result = await deleteWorker.executeJob({
    payload: {
      uri: 'repo/doesnot/exist',
    },
    options: {},
    timestamp: 0,
  });

  expect(result.uri).toEqual('repo/doesnot/exist');
  expect(result.res).toBeTruthy();

  // Non of them should be called.
  expect(cancelIndexJobSpy.notCalled).toBeTruthy();
  expect(cancelCloneJobSpy.notCalled).toBeTruthy();
  expect(cancelUpdateJobSpy.notCalled).toBeTruthy();
  expect(newInstanceSpy.notCalled).toBeTruthy();
  expect(removeSpy.notCalled).toBeTruthy();
  expect(deleteSpy.notCalled).toBeTruthy();
  expect(deleteWorkspaceSpy.notCalled).toBeTruthy();
});

test('On delete job uri contains ../', async () => {
  // Setup RepositoryService
  const removeSpy = sinon.fake.returns(Promise.resolve());
  const repoService = {
    remove: emptyAsyncFunc,
  };
  repoService.remove = removeSpy;
  const repoServiceFactory = {
    newInstance: (): void => {
      return;
    },
  };
  const newInstanceSpy = sinon.fake.returns(repoService);
  repoServiceFactory.newInstance = newInstanceSpy;

  // Setup CancellationService
  const cancelIndexJobSpy = sinon.spy();
  const cancelCloneJobSpy = sinon.spy();
  const cancelUpdateJobSpy = sinon.spy();
  const cancellationService = {
    cancelCloneJob: emptyAsyncFunc,
    cancelUpdateJob: emptyAsyncFunc,
    cancelIndexJob: emptyAsyncFunc,
  };
  cancellationService.cancelIndexJob = cancelIndexJobSpy;
  cancellationService.cancelCloneJob = cancelCloneJobSpy;
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;

  // Setup EsClient
  const deleteSpy = sinon.fake.returns(Promise.resolve());
  const getSpy = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryIndexStatusReservedField]: {
          uri: 'github.com/elastic/kibana/../../../../foo/bar',
          progress: WorkerReservedProgress.COMPLETED,
          timestamp: new Date(),
          revision: 'abcdefg',
        },
      },
    })
  );
  const esClient = {
    indices: {
      delete: emptyAsyncFunc,
    },
    get: emptyAsyncFunc,
  };
  esClient.indices.delete = deleteSpy;
  esClient.get = getSpy;

  // Setup LspService
  const deleteWorkspaceSpy = sinon.fake.returns(Promise.resolve());
  const lspService = {
    deleteWorkspace: emptyAsyncFunc,
  };
  lspService.deleteWorkspace = deleteWorkspaceSpy;

  // Setup GitOperations
  const cleanRepoSpy = sinon.spy();
  const gitOps = {
    cleanRepo: cleanRepoSpy,
  };

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {},
    } as ServerOptions,
    (gitOps as any) as GitOperations,
    (cancellationService as any) as CancellationSerivce,
    (lspService as any) as LspService,
    (repoServiceFactory as any) as RepositoryServiceFactory
  );

  const result = await deleteWorker.executeJob({
    payload: {
      uri: 'github.com/elastic/kibana/../../../../foo/bar',
    },
    options: {},
    timestamp: 0,
  });

  expect(result.uri).toEqual('github.com/elastic/kibana/../../../../foo/bar');
  expect(result.res).toBeTruthy();

  // Non of them should be called.
  expect(cancelIndexJobSpy.notCalled).toBeTruthy();
  expect(cancelCloneJobSpy.notCalled).toBeTruthy();
  expect(cancelUpdateJobSpy.notCalled).toBeTruthy();
  expect(newInstanceSpy.notCalled).toBeTruthy();
  expect(removeSpy.notCalled).toBeTruthy();
  expect(deleteSpy.notCalled).toBeTruthy();
  expect(deleteWorkspaceSpy.notCalled).toBeTruthy();
});

test('On delete job enqueued.', async () => {
  // Setup EsClient
  const indexSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    index: emptyAsyncFunc,
  };
  esClient.index = indexSpy;

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {} as ServerOptions,
    {} as GitOperations,
    {} as CancellationSerivce,
    {} as LspService,
    {} as RepositoryServiceFactory
  );

  await deleteWorker.onJobEnqueued({
    payload: {
      uri: 'github.com/elastic/kibana',
    },
    options: {},
    timestamp: 0,
  });

  expect(indexSpy.calledOnce).toBeTruthy();
});

test('On delete job completed.', async () => {
  // Setup EsClient
  const updateSpy = sinon.fake.returns(Promise.resolve());
  const esClient = {
    update: emptyAsyncFunc,
  };
  esClient.update = updateSpy;

  const deleteWorker = new DeleteWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {} as ServerOptions,
    {} as GitOperations,
    {} as CancellationSerivce,
    {} as LspService,
    {} as RepositoryServiceFactory
  );

  await deleteWorker.onJobCompleted(
    {
      payload: {
        uri: 'github.com/elastic/kibana',
      },
      options: {},
      timestamp: 0,
    },
    {
      uri: 'github.com/elastic/kibana',
    }
  );

  // Nothing is called.
  expect(updateSpy.notCalled).toBeTruthy();
});
