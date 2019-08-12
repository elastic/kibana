/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { EsClient, Esqueue } from '../lib/esqueue';
import { Repository } from '../../model';
import { DiskWatermarkService } from '../disk_watermark';
import { GitOperations } from '../git_operations';
import { Logger } from '../log';
import { RepositoryServiceFactory } from '../repository_service_factory';
import { ServerOptions } from '../server_options';
import { emptyAsyncFunc } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { CancellationSerivce } from './cancellation_service';
import { UpdateWorker } from './update_worker';

const log: Logger = new ConsoleLoggerFactory().getLogger(['test']);

const esClient = {
  update: emptyAsyncFunc,
  get: emptyAsyncFunc,
};
const esQueue = {};

afterEach(() => {
  sinon.restore();
});

test('Execute update job', async () => {
  // Setup RepositoryService
  const updateSpy = sinon.spy();
  const repoService = {
    update: emptyAsyncFunc,
  };
  repoService.update = updateSpy;
  const repoServiceFactory = {
    newInstance: (): void => {
      return;
    },
  };
  const newInstanceSpy = sinon.fake.returns(repoService);
  repoServiceFactory.newInstance = newInstanceSpy;

  // Setup CancellationService
  const cancelUpdateJobSpy = sinon.spy();
  const registerCancelableUpdateJobSpy = sinon.spy();
  const cancellationService: any = {
    cancelUpdateJob: emptyAsyncFunc,
    registerCancelableUpdateJob: emptyAsyncFunc,
  };
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;
  cancellationService.registerCancelableUpdateJob = registerCancelableUpdateJobSpy;

  // Setup DiskWatermarkService
  const isLowWatermarkSpy = sinon.stub().resolves(false);
  const diskWatermarkService: any = {
    isLowWatermark: isLowWatermarkSpy,
  };

  const updateWorker = new UpdateWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {
        enableGitCertCheck: true,
      },
      disk: {
        thresholdEnabled: true,
        watermarkLowMb: 100,
      },
    } as ServerOptions,
    {} as GitOperations,
    (repoServiceFactory as any) as RepositoryServiceFactory,
    cancellationService as CancellationSerivce,
    diskWatermarkService as DiskWatermarkService
  );

  await updateWorker.executeJob({
    payload: {
      uri: 'mockrepo',
    },
    options: {},
    timestamp: 0,
  });

  expect(isLowWatermarkSpy.calledOnce).toBeTruthy();
  expect(newInstanceSpy.calledOnce).toBeTruthy();
  expect(updateSpy.calledOnce).toBeTruthy();
});

test('On update job completed because of cancellation ', async () => {
  // Setup RepositoryService
  const updateSpy = sinon.spy();

  // Setup CancellationService
  const cancelUpdateJobSpy = sinon.spy();
  const registerCancelableUpdateJobSpy = sinon.spy();
  const cancellationService: any = {
    cancelUpdateJob: emptyAsyncFunc,
    registerCancelableUpdateJob: emptyAsyncFunc,
  };
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;
  cancellationService.registerCancelableUpdateJob = registerCancelableUpdateJobSpy;

  const updateWorker = new UpdateWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {
        enableGitCertCheck: true,
      },
      disk: {
        thresholdEnabled: true,
        watermarkLowMb: 100,
      },
    } as ServerOptions,
    {} as GitOperations,
    {} as RepositoryServiceFactory,
    cancellationService as CancellationSerivce,
    {} as DiskWatermarkService
  );

  await updateWorker.onJobCompleted(
    {
      payload: {
        uri: 'mockrepo',
      },
      options: {},
      timestamp: 0,
    },
    {
      uri: 'github.com/Microsoft/TypeScript-Node-Starter',
      repo: ({
        uri: 'github.com/Microsoft/TypeScript-Node-Starter',
      } as any) as Repository,
      // Update job is done because of cancellation.
      cancelled: true,
    }
  );

  // The elasticsearch update won't be called for the sake of
  // cancellation.
  expect(updateSpy.notCalled).toBeTruthy();
});

test('Execute update job failed because of low disk watermark ', async () => {
  // Setup RepositoryService
  const updateSpy = sinon.spy();
  const repoService = {
    update: emptyAsyncFunc,
  };
  repoService.update = updateSpy;
  const repoServiceFactory = {
    newInstance: (): void => {
      return;
    },
  };
  const newInstanceSpy = sinon.fake.returns(repoService);
  repoServiceFactory.newInstance = newInstanceSpy;

  // Setup CancellationService
  const cancelUpdateJobSpy = sinon.spy();
  const registerCancelableUpdateJobSpy = sinon.spy();
  const cancellationService: any = {
    cancelUpdateJob: emptyAsyncFunc,
    registerCancelableUpdateJob: emptyAsyncFunc,
  };
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;
  cancellationService.registerCancelableUpdateJob = registerCancelableUpdateJobSpy;

  // Setup DiskWatermarkService
  const isLowWatermarkSpy = sinon.stub().resolves(true);
  const diskWatermarkService: any = {
    isLowWatermark: isLowWatermarkSpy,
  };

  const updateWorker = new UpdateWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {
        enableGitCertCheck: true,
      },
      disk: {
        thresholdEnabled: true,
        watermarkLowMb: 100,
      },
    } as ServerOptions,
    {} as GitOperations,
    {} as RepositoryServiceFactory,
    cancellationService as CancellationSerivce,
    diskWatermarkService as DiskWatermarkService
  );

  try {
    await updateWorker.executeJob({
      payload: {
        uri: 'mockrepo',
      },
      options: {},
      timestamp: 0,
    });
    // This step should not be touched.
    expect(false).toBeTruthy();
  } catch (error) {
    // Exception should be thrown.
    expect(isLowWatermarkSpy.calledOnce).toBeTruthy();
    expect(newInstanceSpy.notCalled).toBeTruthy();
    expect(updateSpy.notCalled).toBeTruthy();
  }
});

test('On update job error or timeout will not persis error', async () => {
  // Setup EsClient
  const esUpdateSpy = sinon.spy();
  esClient.update = esUpdateSpy;

  // Setup CancellationService
  const cancelUpdateJobSpy = sinon.spy();
  const registerCancelableUpdateJobSpy = sinon.spy();
  const cancellationService: any = {
    cancelUpdateJob: emptyAsyncFunc,
    registerCancelableUpdateJob: emptyAsyncFunc,
  };
  cancellationService.cancelUpdateJob = cancelUpdateJobSpy;
  cancellationService.registerCancelableUpdateJob = registerCancelableUpdateJobSpy;

  const updateWorker = new UpdateWorker(
    esQueue as Esqueue,
    log,
    esClient as EsClient,
    {
      security: {
        enableGitCertCheck: true,
      },
      disk: {
        thresholdEnabled: true,
        watermarkLowMb: 100,
      },
    } as ServerOptions,
    {} as GitOperations,
    {} as RepositoryServiceFactory,
    cancellationService as CancellationSerivce,
    {} as DiskWatermarkService
  );

  await updateWorker.onJobExecutionError({
    job: {
      payload: {
        uri: 'mockrepo',
      },
      options: {},
      timestamp: 0,
    },
    error: 'mock error message',
  });

  // The elasticsearch update will be called and the progress should be 'Completed'
  expect(esUpdateSpy.calledOnce).toBeTruthy();
  const updateBody = JSON.parse(esUpdateSpy.getCall(0).args[0].body);
  expect(updateBody.doc.repository_git_status.progress).toBe(100);
});
