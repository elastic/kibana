/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import type { estypes } from '@elastic/elasticsearch';
import { omit } from 'lodash';
import { Report } from '../store';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { KibanaShuttingDownError } from '@kbn/reporting-common';
import type { ReportDocument } from '@kbn/reporting-common/types';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { cryptoFactory, type ExportType, type ReportingConfigType } from '@kbn/reporting-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { RunSingleReportTask, REPORTING_EXECUTE_TYPE } from '.';
import type { ReportingCore } from '../..';
import { createMockReportingCore } from '../../test_helpers';
import type { FakeRawRequest, KibanaRequest } from '@kbn/core/server';
import { EventTracker } from '../../usage';
import { eventTrackerMock } from '../../usage/event_tracker.mock';
import type { ReportingStore } from '../store';

interface StreamMock {
  getSeqNo: () => number;
  getPrimaryTerm: () => number;
  write: (data: string) => void;
  fail: () => void;
  end: () => void;
  transform: Transform;
}

const coreSetupMock = coreMock.createSetup();

const encryptHeaders = async (encryptionKey: string, headers: Record<string, string>) => {
  const crypto = cryptoFactory(encryptionKey);
  return await crypto.encrypt(headers);
};

const headers = {
  host: '10.47.192.8:18187',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'content-length': '561',
  accept: '*/*',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'en-US,en;q=0.9',
  'content-type': 'application/json',
  cookie:
    'sid=Fe26.2**97c9c6d402fe714880e577f9631504ea8d053057cf50e64f5015b790e761dede*9UD4CPVSnKPG0SJvRh5eQQ*V0kPrRFbhY8xa2rEsOHMryMlkBEEZ11o6IjK5-yeP1zU1OEuemFQlLQ6bXd9-yL1hTq6GgLrQ7Yj6VBdTJb3eYE7FiE-yMDpkmkfw2UrXxo4bWae4oKP3nBg4X1R4IoCGMNv61bAFf5-LS_3ABWK683spsCcm7rS61FwwZQ-e_jHam8YUOKBAc2sC8agXNs_OAVaxVzXrlgelfst3IkXSKeGyU44WXdgW2NPZbfat9YEDFNl_KPYxAZUOzm5lAcv**1a34a8806218f53f73827d7c4726141a0fdb229326811072a04eda5c24218a37*o-ooltTA0WPrpS8oswgMAvezEg9vWq4M5FPKUg9EhL8',
  dnt: '1',
  'kbn-build-number': '85199',
  'kbn-version': '9.1.0-SNAPSHOT',
  origin: 'https://kibana-pr-216558.kb.us-west2.gcp.elastic-cloud.com',
  priority: 'u=1, i',
  referer: 'https://kibana-pr-216558.kb.us-west2.gcp.elastic-cloud.com/app/discover',
  'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'x-cloud-request-id': 'VlZunCr1RI-NEe1s6dq0qg',
  'x-elastic-internal-origin': 'Kibana',
  'x-elastic-project-id': 'ea761662217ed1bdab44a8fa8fcae93c',
  'x-forwarded-for': '71.244.144.116',
  'x-forwarded-host': 'kibana-pr-216558.kb.us-west2.gcp.elastic-cloud.com',
  'x-forwarded-proto': 'https',
  'x-found-kibana-cluster': '14363a5a2de54e868c616a4d5f558173',
  'x-kbn-context':
    '%7B%22type%22%3A%22application%22%2C%22name%22%3A%22discover%22%2C%22url%22%3A%22%2Fapp%2Fdiscover%22%2C%22page%22%3A%22app%22%2C%22id%22%3A%22new%22%7D',
  authorization: 'Basic ZWxhc3RpYzpTaUtXTlFWekhpRUoybmZ6SkpGMDlLT3c=',
};

function createStreamMock(): StreamMock {
  const transform: Transform = new Transform({});

  return {
    getSeqNo: () => 10,
    getPrimaryTerm: () => 20,
    write: (data: string) => {
      transform.push(`${data}\n`);
    },
    fail: () => {
      transform.emit('error', new Error('Stream failed'));
      transform.end();
    },
    transform,
    end: () => {
      transform.end();
    },
  };
}

const mockStream = createStreamMock();
const mockEventTracker = eventTrackerMock.create();

jest.mock('../content_stream', () => ({
  getContentStream: () => mockStream,
  finishedWithNoPendingCallbacks: () => Promise.resolve(),
}));

const logger = loggingSystemMock.createLogger();
const fakeRawRequest: FakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
};

describe('Run Single Report Task', () => {
  let mockReporting: ReportingCore;
  let configType: ReportingConfigType;
  beforeEach(async () => {
    jest.clearAllMocks();
    configType = createMockConfigSchema();
    mockReporting = await createMockReportingCore(configType);
  });

  it('Instance setup', () => {
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxAttempts": ${configType.capture.maxAttempts},
        "maxConcurrency": 1,
        "timeout": "120s",
        "title": "Reporting: execute job",
        "type": "report:execute",
      }
    `);
  });

  it('Instance start', () => {
    const mockTaskManager = taskManagerMock.createStart();
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    expect(task.init(mockTaskManager));
    expect(task.getStatus()).toBe('initialized');
  });

  it('create task runner', async () => {
    logger.info = jest.fn();
    logger.error = jest.fn();

    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: { index: 'cool-reporting-index', id: 'cool-reporting-id' },
      },
    } as unknown as RunContext);
    expect(taskRunner).toHaveProperty('run');
    expect(taskRunner).toHaveProperty('cancel');
  });

  it('Max Concurrency is 0 if pollEnabled is false', () => {
    const queueConfig = {
      queue: { pollEnabled: false, timeout: 55000 },
    } as unknown as ReportingConfigType['queue'];

    const task = new RunSingleReportTask({
      reporting: mockReporting,
      config: { ...configType, ...queueConfig },
      logger,
    });
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxAttempts": 1,
        "maxConcurrency": 0,
        "timeout": "55s",
        "title": "Reporting: execute job",
        "type": "report:execute",
      }
    `);
  });

  it('schedules task with request if health indicates security and api keys are enabled', async () => {
    jest.spyOn(mockReporting, 'getHealthInfo').mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
      areNotificationsEnabled: true,
    });
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    await task.scheduleTask(
      fakeRawRequest as unknown as KibanaRequest,
      {
        _id: 'test',
        jobtype: 'test1',
        status: 'pending',
      } as never
    );

    expect(mockTaskManager.schedule).toHaveBeenCalledWith(
      {
        taskType: REPORTING_EXECUTE_TYPE,
        state: {},
        params: {
          _id: 'test',
          jobtype: 'test1',
          status: 'pending',
          useInternalUser: false,
        },
      },
      { request: fakeRawRequest }
    );
  });

  it('schedules task without request if health indicates security is disabled', async () => {
    jest.spyOn(mockReporting, 'getHealthInfo').mockResolvedValueOnce({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: true,
      areNotificationsEnabled: false,
    });
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    await task.scheduleTask(
      fakeRawRequest as unknown as KibanaRequest,
      {
        _id: 'test',
        jobtype: 'test1',
        status: 'pending',
      } as never
    );

    expect(mockTaskManager.schedule).toHaveBeenCalledWith({
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params: {
        _id: 'test',
        jobtype: 'test1',
        status: 'pending',
        useInternalUser: false,
      },
    });
  });

  it('schedules task without request if health indicates no permanent encryption key', async () => {
    jest.spyOn(mockReporting, 'getHealthInfo').mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
      areNotificationsEnabled: true,
    });
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    await task.scheduleTask(
      fakeRawRequest as unknown as KibanaRequest,
      {
        _id: 'test',
        jobtype: 'test1',
        status: 'pending',
      } as never
    );

    expect(mockTaskManager.schedule).toHaveBeenCalledWith({
      taskType: REPORTING_EXECUTE_TYPE,
      state: {},
      params: {
        _id: 'test',
        jobtype: 'test1',
        status: 'pending',
        useInternalUser: false,
      },
    });
  });

  it('uses authorization headers from task manager fake request if defined', async () => {
    const notifyUsage = jest.fn();
    const runTaskFn = jest.fn().mockResolvedValue({ content_type: 'application/pdf' });
    mockReporting.getExportTypesRegistry().register({
      id: 'test1',
      name: 'Test1',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test1 single export',
      notifyUsage,
      jobContentEncoding: 'base64',
      jobType: 'test1',
      validLicenses: [],
    } as unknown as ExportType);
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'claimJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test1', status: 'pending' } as never);
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'completeJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test1', status: 'pending' } as never);
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: { index: 'cool-reporting-index', id: 'test1', jobtype: 'test1', payload: {} },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await taskRunner.run();

    expect(notifyUsage).toHaveBeenCalledWith('single');
    expect(runTaskFn.mock.calls[0][0].request.headers).toEqual({
      authorization: 'ApiKey skdjtq4u543yt3rhewrh',
    });
  });

  it('uses decrypted headers from report doc if defined and no fake request from task manager', async () => {
    const encryptedHeaders = await encryptHeaders(
      'cool-encryption-key-where-did-you-find-it',
      headers
    );
    const notifyUsage = jest.fn();
    const runTaskFn = jest.fn().mockResolvedValue({ content_type: 'application/pdf' });
    mockReporting.getExportTypesRegistry().register({
      id: 'test2',
      name: 'Test2',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test2 single export',
      notifyUsage,
      jobContentEncoding: 'base64',
      jobType: 'test2',
      validLicenses: [],
    } as unknown as ExportType);
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'claimJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test2', status: 'pending' } as never);
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'completeJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test2', status: 'pending' } as never);
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: {
          index: 'cool-reporting-index',
          id: 'test2',
          jobtype: 'test2',
          payload: { headers: encryptedHeaders },
        },
      },
    } as unknown as RunContext);

    await taskRunner.run();

    expect(notifyUsage).toHaveBeenCalledWith('single');
    expect(runTaskFn.mock.calls[0][0].request.headers).toEqual(headers);
  });

  it('uses api key authorization with merged decryted headers when both are available', async () => {
    const encryptedHeaders = await encryptHeaders(
      'cool-encryption-key-where-did-you-find-it',
      headers
    );
    const notifyUsage = jest.fn();
    const runTaskFn = jest.fn().mockResolvedValue({ content_type: 'application/pdf' });
    mockReporting.getExportTypesRegistry().register({
      id: 'test3',
      name: 'Test3',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test3 single export',
      notifyUsage,
      jobContentEncoding: 'base64',
      jobType: 'test3',
      validLicenses: [],
    } as unknown as ExportType);
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'claimJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test3', status: 'pending' } as never);
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'completeJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test3', status: 'pending' } as never);
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: {
          index: 'cool-reporting-index',
          id: 'test3',
          jobtype: 'test3',
          payload: { headers: encryptedHeaders },
        },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await taskRunner.run();

    expect(notifyUsage).toHaveBeenCalledWith('single');
    expect(runTaskFn.mock.calls[0][0].request.headers).toEqual({
      ...omit(headers, ['authorization', 'cookie']),
      authorization: 'ApiKey skdjtq4u543yt3rhewrh',
    });
  });

  it('sends telemetry event when job is claimed', async () => {
    const runTaskFn = jest.fn().mockResolvedValue({ content_type: 'application/pdf' });
    mockReporting.getExportTypesRegistry().register({
      id: 'test1',
      name: 'Test1',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test1 single export',
      notifyUsage: jest.fn(),
      jobContentEncoding: 'base64',
      jobType: 'test1',
      validLicenses: [],
    } as unknown as ExportType);
    mockReporting.getStore = () =>
      Promise.resolve({
        findReportFromTask: jest.fn().mockImplementation(
          (report) =>
            new Report({
              ...report,
              _id: 'test',
              _index: '.reporting-foo-index-234',
              _seq_no: 1,
              _primary_term: 1,
              payload: { objectType: 'dashboard' },
            })
        ),
        setReportClaimed: jest.fn().mockImplementation(() => ({ _seq_no: 1, _primary_term: 1 })),
      } as unknown as ReportingStore);
    mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'completeJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test1', status: 'pending' } as never);
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: { index: 'cool-reporting-index', id: 'test1', jobtype: 'test1', payload: {} },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await taskRunner.run();

    expect(mockReporting.getEventTracker).toHaveBeenCalledWith('test', 'test1', 'dashboard');
    expect(mockEventTracker.claimJob).toHaveBeenCalledWith({
      timeSinceCreation: expect.any(Number),
      scheduleType: 'single',
    });
  });

  it('throws during reporting if Kibana starts shutting down', async () => {
    mockReporting.getExportTypesRegistry().register({
      id: 'noop',
      name: 'Noop',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: () => new Promise(() => {}),
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: pdf single export',
      notifyUsage: jest.fn(),
      jobContentExtension: 'pdf',
      jobType: 'noop',
      validLicenses: [],
    } as unknown as ExportType);
    const store = await mockReporting.getStore();
    store.setReportFailed = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'noop',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'claimJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'noop', status: 'pending' } as never);
    jest
      // @ts-expect-error TS compilation fails: this overrides a protected method of the RunSingleReportTask instance
      .spyOn(task, 'getEventTracker')
      // @ts-ignore
      .mockReturnValue(new EventTracker(coreSetupMock.analytics, 'jobId', 'exportTypeId', 'appId'));

    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: { index: 'cool-reporting-index', id: 'noop', jobtype: 'noop', payload: {} },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    const taskPromise = taskRunner.run();
    setImmediate(() => {
      mockReporting.pluginStop();
    });
    await taskPromise.catch(() => {});

    expect(store.setReportFailed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        _id: 'test',
      }),
      expect.objectContaining({
        error: expect.objectContaining({
          message: `ReportingError(code: ${new KibanaShuttingDownError().code})`,
        }),
      })
    );
  });

  it('updates report with error message if error occurs during task run', async () => {
    configType = createMockConfigSchema({ capture: { maxAttempts: 3 } });
    mockReporting = await createMockReportingCore(configType);
    const runTaskFn = jest.fn().mockImplementation(() => {
      throw new Error('failure generating report');
    });
    mockReporting.getExportTypesRegistry().register({
      id: 'test1',
      name: 'Test1',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test1 single export',
      notifyUsage: jest.fn(),
      jobContentEncoding: 'base64',
      jobType: 'test1',
      validLicenses: [],
    } as unknown as ExportType);
    const store = await mockReporting.getStore();
    store.setReportError = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'test1',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    store.setReportFailed = jest.fn();
    logger.info = jest.fn();
    logger.error = jest.fn();

    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'claimJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test1', status: 'pending' } as never);
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);
    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        attempts: 1,
        params: { index: 'cool-reporting-index', id: 'test1', jobtype: 'test1', payload: {} },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await expect(() => taskRunner.run()).rejects.toThrowError('failure generating report');

    expect(logger.error).toHaveBeenCalledWith(
      new Error(`Saving execution error for test1 job test: Error: failure generating report`),
      {
        tags: ['test'],
      }
    );
    expect(store.setReportFailed).not.toHaveBeenCalled();
    expect(store.setReportError).toHaveBeenCalledWith(
      {
        _id: 'test',
        jobtype: 'test1',
        status: 'pending',
      },
      {
        output: null,
        error: expect.objectContaining({ name: 'Error', message: 'failure generating report' }),
      }
    );
  });

  it('updates report with error message and failed status if error occurs during task run during last attempt', async () => {
    const runTaskFn = jest.fn().mockImplementation(() => {
      throw new Error('failure generating report');
    });

    mockReporting.getExportTypesRegistry().register({
      id: 'test1',
      name: 'Test1',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test1 single export',
      notifyUsage: jest.fn(),
      jobContentEncoding: 'base64',
      jobType: 'test1',
      validLicenses: [],
    } as unknown as ExportType);
    const store = await mockReporting.getStore();
    store.setReportFailed = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'test1',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    store.setReportError = jest.fn();
    logger.info = jest.fn();
    logger.error = jest.fn();

    const task = new RunSingleReportTask({ reporting: mockReporting, config: configType, logger });
    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunSingleReportTask instance
      .spyOn(task, 'claimJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test1', status: 'pending' } as never);
    jest
      // @ts-expect-error TS compilation fails: this overrides a protected method of the RunSingleReportTask instance
      .spyOn(task, 'getEventTracker')
      // @ts-ignore
      .mockReturnValue(new EventTracker(coreSetupMock.analytics, 'jobId', 'exportTypeId', 'appId'));
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);
    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        attempts: 3,
        params: { index: 'cool-reporting-index', id: 'test1', jobtype: 'test1', payload: {} },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await expect(() => taskRunner.run()).rejects.toThrowError('failure generating report');

    expect(logger.error).toHaveBeenCalledWith(
      new Error(`Saving execution error for test1 job test: Error: failure generating report`),
      { tags: ['test'] }
    );
    expect(store.setReportError).not.toHaveBeenCalled();
    expect(store.setReportFailed).toHaveBeenCalledWith(
      {
        _id: 'test',
        jobtype: 'test1',
        status: 'pending',
      },
      {
        output: {
          content: `ReportingError(code: unknown_error) \"failure generating report\"`,
          content_type: null,
          error_code: 'unknown_error',
          size: 63,
          warnings: [`ReportingError(code: unknown_error) \"failure generating report\"`],
        },
        completed_at: expect.any(String),
        error: expect.objectContaining({ name: 'Error', message: 'failure generating report' }),
      }
    );
  });
});
