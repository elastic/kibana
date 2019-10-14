/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import assert from 'assert';
import { delay } from 'bluebird';
import path from 'path';
import rimraf from 'rimraf';
import sinon from 'sinon';
import { prepareProjectByCloning as prepareProject } from '../test_utils';
import { CloneWorkerResult, Repository } from '../../model';
import { DiskWatermarkService } from '../disk_watermark';
import { GitOperations } from '../git_operations';
import { EsClient, Esqueue } from '../lib/esqueue';
import { Logger } from '../log';
import { CloneWorker, IndexWorker } from '../queue';
import { CancellationReason, CancellationSerivce } from '../queue/cancellation_service';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { createTestServerOption, emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esQueue = {};

const serverOptions = createTestServerOption();
const gitOps = new GitOperations(serverOptions.repoPath);

function cleanWorkspace() {
  return new Promise(resolve => {
    rimraf(serverOptions.workspacePath, resolve);
  });
}

describe('clone_worker_tests', () => {
  // @ts-ignore
  before(async () => {
    return new Promise(resolve => {
      rimraf(serverOptions.repoPath, resolve);
    });
  });

  beforeEach(async function() {
    // @ts-ignore
    this.timeout(200000);
    await prepareProject(
      'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      path.join(serverOptions.repoPath, 'github.com/Microsoft/TypeScript-Node-Starter')
    );
  });
  // @ts-ignore
  after(() => {
    return cleanWorkspace();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('Execute clone job', async () => {
    // Setup RepositoryService
    const cloneSpy = sinon.spy();
    const repoService = {
      clone: emptyAsyncFunc,
    };
    repoService.clone = cloneSpy;
    const repoServiceFactory = {
      newInstance: (): void => {
        return;
      },
    };
    const newInstanceSpy = sinon.fake.returns(repoService);
    repoServiceFactory.newInstance = newInstanceSpy;

    // Setup CancellationService
    const cancelCloneJobSpy = sinon.spy();
    const registerCancelableCloneJobSpy = sinon.spy();
    const cancellationService: any = {
      cancelCloneJob: emptyAsyncFunc,
      registerCancelableCloneJob: emptyAsyncFunc,
    };
    cancellationService.cancelCloneJob = cancelCloneJobSpy;
    cancellationService.registerCancelableCloneJob = registerCancelableCloneJobSpy;

    // Setup DiskWatermarkService
    const isLowWatermarkSpy = sinon.stub().resolves(false);
    const diskWatermarkService: any = {
      isLowWatermark: isLowWatermarkSpy,
    };

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      {} as EsClient,
      serverOptions,
      gitOps,
      {} as IndexWorker,
      (repoServiceFactory as any) as RepositoryServiceFactory,
      cancellationService as CancellationSerivce,
      diskWatermarkService as DiskWatermarkService
    );

    await cloneWorker.executeJob({
      payload: {
        url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      },
      options: {},
      timestamp: 0,
    });

    assert.ok(isLowWatermarkSpy.calledOnce);
    assert.ok(newInstanceSpy.calledOnce);
    assert.ok(cloneSpy.calledOnce);
  });

  it('On clone job completed.', async () => {
    // Setup IndexWorker
    const enqueueJobSpy = sinon.spy();
    const indexWorker = {
      enqueueJob: emptyAsyncFunc,
    };
    indexWorker.enqueueJob = enqueueJobSpy;

    // Setup EsClient
    const updateSpy = sinon.spy();
    const esClient = {
      update: emptyAsyncFunc,
    };
    esClient.update = updateSpy;

    // Setup CancellationService
    const cancelCloneJobSpy = sinon.spy();
    const registerCancelableCloneJobSpy = sinon.spy();
    const cancellationService: any = {
      cancelCloneJob: emptyAsyncFunc,
      registerCancelableCloneJob: emptyAsyncFunc,
    };
    cancellationService.cancelCloneJob = cancelCloneJobSpy;
    cancellationService.registerCancelableCloneJob = registerCancelableCloneJobSpy;

    // Setup DiskWatermarkService
    const isLowWatermarkSpy = sinon.stub().resolves(false);
    const diskWatermarkService: any = {
      isLowWatermark: isLowWatermarkSpy,
    };

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      esClient as EsClient,
      serverOptions,
      gitOps,
      (indexWorker as any) as IndexWorker,
      {} as RepositoryServiceFactory,
      cancellationService as CancellationSerivce,
      diskWatermarkService as DiskWatermarkService
    );

    await cloneWorker.onJobCompleted(
      {
        payload: {
          url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
        },
        options: {},
        timestamp: 0,
      },
      {
        uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        repo: ({
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        } as any) as Repository,
      }
    );

    // EsClient update got called 3 times:
    // * update default branch and revision of a repository object
    // * update the revision in the git clone status
    // * update the clone progress
    assert.ok(updateSpy.calledThrice);

    // Index request is issued after a 1s delay.
    await delay(1000);
    assert.ok(enqueueJobSpy.calledOnce);

    assert.ok(isLowWatermarkSpy.notCalled);
  });

  it('On clone job completed because of cancellation', async () => {
    // Setup IndexWorker
    const enqueueJobSpy = sinon.spy();
    const indexWorker = {
      enqueueJob: emptyAsyncFunc,
    };
    indexWorker.enqueueJob = enqueueJobSpy;

    // Setup EsClient
    const updateSpy = sinon.spy();
    const esClient = {
      update: emptyAsyncFunc,
    };
    esClient.update = updateSpy;

    // Setup CancellationService
    const cancelCloneJobSpy = sinon.spy();
    const registerCancelableCloneJobSpy = sinon.spy();
    const cancellationService: any = {
      cancelCloneJob: emptyAsyncFunc,
      registerCancelableCloneJob: emptyAsyncFunc,
    };
    cancellationService.cancelCloneJob = cancelCloneJobSpy;
    cancellationService.registerCancelableCloneJob = registerCancelableCloneJobSpy;

    // Setup DiskWatermarkService
    const isLowWatermarkSpy = sinon.stub().resolves(false);
    const diskWatermarkService: any = {
      isLowWatermark: isLowWatermarkSpy,
    };

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      esClient as EsClient,
      serverOptions,
      gitOps,
      (indexWorker as any) as IndexWorker,
      {} as RepositoryServiceFactory,
      cancellationService as CancellationSerivce,
      diskWatermarkService as DiskWatermarkService
    );

    await cloneWorker.onJobCompleted(
      {
        payload: {
          url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
        },
        options: {},
        timestamp: 0,
      },
      {
        uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        repo: ({
          uri: 'github.com/Microsoft/TypeScript-Node-Starter',
        } as any) as Repository,
        cancelled: true,
      }
    );

    // EsClient update should not be called for the sake of clone
    // cancellation.
    assert.ok(updateSpy.notCalled);

    // Index request should not be issued after clone request is done.
    await delay(1000);
    assert.ok(enqueueJobSpy.notCalled);

    assert.ok(isLowWatermarkSpy.notCalled);
  });

  it('On clone job enqueued.', async () => {
    // Setup EsClient
    const indexSpy = sinon.spy();
    const esClient = {
      index: emptyAsyncFunc,
    };
    esClient.index = indexSpy;

    // Setup CancellationService
    const cancelCloneJobSpy = sinon.spy();
    const registerCancelableCloneJobSpy = sinon.spy();
    const cancellationService: any = {
      cancelCloneJob: emptyAsyncFunc,
      registerCancelableCloneJob: emptyAsyncFunc,
    };
    cancellationService.cancelCloneJob = cancelCloneJobSpy;
    cancellationService.registerCancelableCloneJob = registerCancelableCloneJobSpy;

    // Setup DiskWatermarkService
    const isLowWatermarkSpy = sinon.stub().resolves(false);
    const diskWatermarkService: any = {
      isLowWatermark: isLowWatermarkSpy,
    };

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      (esClient as any) as EsClient,
      serverOptions,
      gitOps,
      {} as IndexWorker,
      {} as RepositoryServiceFactory,
      cancellationService as CancellationSerivce,
      diskWatermarkService as DiskWatermarkService
    );

    await cloneWorker.onJobEnqueued({
      payload: {
        url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
      },
      options: {},
      timestamp: 0,
    });

    // Expect EsClient index to be called to update the progress to 0.
    assert.ok(indexSpy.calledOnce);
  });

  it('Skip clone job for invalid git url', async () => {
    // Setup RepositoryService
    const cloneSpy = sinon.spy();
    const repoService = {
      clone: emptyAsyncFunc,
    };
    repoService.clone = cloneSpy;
    const repoServiceFactory = {
      newInstance: (): void => {
        return;
      },
    };
    const newInstanceSpy = sinon.fake.returns(repoService);
    repoServiceFactory.newInstance = newInstanceSpy;

    // Setup CancellationService
    const cancelCloneJobSpy = sinon.spy();
    const registerCancelableCloneJobSpy = sinon.spy();
    const cancellationService: any = {
      cancelCloneJob: emptyAsyncFunc,
      registerCancelableCloneJob: emptyAsyncFunc,
    };
    cancellationService.cancelCloneJob = cancelCloneJobSpy;
    cancellationService.registerCancelableCloneJob = registerCancelableCloneJobSpy;

    // Setup DiskWatermarkService
    const isLowWatermarkSpy = sinon.stub().resolves(false);
    const diskWatermarkService: any = {
      isLowWatermark: isLowWatermarkSpy,
    };

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      {} as EsClient,
      serverOptions,
      gitOps,
      {} as IndexWorker,
      (repoServiceFactory as any) as RepositoryServiceFactory,
      cancellationService as CancellationSerivce,
      diskWatermarkService as DiskWatermarkService
    );

    const result1 = (await cloneWorker.executeJob({
      payload: {
        url: 'file:///foo/bar.git',
      },
      options: {},
      timestamp: 0,
    })) as CloneWorkerResult;

    assert.ok(!result1.repo);
    assert.ok(newInstanceSpy.notCalled);
    assert.ok(cloneSpy.notCalled);
    assert.ok(isLowWatermarkSpy.calledOnce);

    const result2 = (await cloneWorker.executeJob({
      payload: {
        url: '/foo/bar.git',
      },
      options: {},
      timestamp: 0,
    })) as CloneWorkerResult;

    assert.ok(!result2.repo);
    assert.ok(newInstanceSpy.notCalled);
    assert.ok(cloneSpy.notCalled);
    assert.ok(isLowWatermarkSpy.calledTwice);
  });

  it('Execute clone job failed because of low available disk space', async () => {
    // Setup RepositoryService
    const cloneSpy = sinon.spy();
    const repoService = {
      clone: emptyAsyncFunc,
    };
    repoService.clone = cloneSpy;
    const repoServiceFactory = {
      newInstance: (): void => {
        return;
      },
    };
    const newInstanceSpy = sinon.fake.returns(repoService);
    repoServiceFactory.newInstance = newInstanceSpy;

    // Setup CancellationService
    const cancelCloneJobSpy = sinon.spy();
    const registerCancelableCloneJobSpy = sinon.spy();
    const cancellationService: any = {
      cancelCloneJob: emptyAsyncFunc,
      registerCancelableCloneJob: emptyAsyncFunc,
    };
    cancellationService.cancelCloneJob = cancelCloneJobSpy;
    cancellationService.registerCancelableCloneJob = registerCancelableCloneJobSpy;

    // Setup DiskWatermarkService
    const isLowWatermarkSpy = sinon.stub().resolves(true);
    const diskWatermarkService: any = {
      isLowWatermark: isLowWatermarkSpy,
      diskWatermarkViolationMessage: sinon.stub().returns('No enough disk space'),
    };

    // Setup EsClient
    const updateSpy = sinon.spy();
    const esClient = {
      update: emptyAsyncFunc,
    };
    esClient.update = updateSpy;

    // Setup IndexWorker
    const enqueueJobSpy = sinon.spy();
    const indexWorker = {
      enqueueJob: emptyAsyncFunc,
    };
    indexWorker.enqueueJob = enqueueJobSpy;

    const cloneWorker = new CloneWorker(
      esQueue as Esqueue,
      log,
      esClient as EsClient,
      serverOptions,
      gitOps,
      (indexWorker as any) as IndexWorker,
      (repoServiceFactory as any) as RepositoryServiceFactory,
      cancellationService as CancellationSerivce,
      diskWatermarkService as DiskWatermarkService
    );

    let res: CloneWorkerResult = { uri: 'github.com/Microsoft/TypeScript-Node-Starter' };
    try {
      res = (await cloneWorker.executeJob({
        payload: {
          url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
        },
        options: {},
        timestamp: 0,
      })) as CloneWorkerResult;
      // This step should not be touched.
      assert.ok(false);
    } catch (error) {
      assert.ok(isLowWatermarkSpy.calledOnce);
      assert.ok(newInstanceSpy.notCalled);
      assert.ok(cloneSpy.notCalled);
    }

    assert.ok(res.cancelled);
    assert.ok(res.cancelledReason === CancellationReason.LOW_DISK_SPACE);

    const onJobExecutionErrorSpy = sinon.spy();
    cloneWorker.onJobExecutionError = onJobExecutionErrorSpy;

    await cloneWorker.onJobCompleted(
      {
        payload: {
          url: 'https://github.com/Microsoft/TypeScript-Node-Starter.git',
        },
        options: {},
        timestamp: 0,
      },
      res
    );

    assert.ok(onJobExecutionErrorSpy.calledOnce);
    // Non of the follow up steps of a normal complete job should not be called
    // because the job is going to be forwarded as execution error.
    assert.ok(updateSpy.notCalled);
    await delay(1000);
    assert.ok(enqueueJobSpy.notCalled);
  });
});
