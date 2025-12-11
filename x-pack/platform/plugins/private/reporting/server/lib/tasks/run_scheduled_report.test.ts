/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import type { estypes } from '@elastic/elasticsearch';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { MockedLogger } from '@kbn/logging-mocks';
import { JOB_STATUS, KibanaShuttingDownError } from '@kbn/reporting-common';
import type { ReportDocument } from '@kbn/reporting-common/types';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { type ExportType, type ReportingConfigType } from '@kbn/reporting-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { notificationsMock } from '@kbn/notifications-plugin/server/mocks';
import { EventTracker } from '../../usage';
import { RunScheduledReportTask, SCHEDULED_REPORTING_EXECUTE_TYPE } from '.';
import type { ReportingCore } from '../..';
import { createMockReportingCore } from '../../test_helpers';
import type {
  FakeRawRequest,
  KibanaRequest,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { Frequency } from '@kbn/rrule';
import type { ReportingStore } from '../store';
import { SavedReport } from '../store';
import type { ScheduledReportType } from '../../types';
import { EmailNotificationService } from '../../services/notifications/email_notification_service';
import { eventTrackerMock } from '../../usage/event_tracker.mock';

interface StreamMock {
  getSeqNo: () => number;
  getPrimaryTerm: () => number;
  write: (data: string) => void;
  fail: () => void;
  end: () => void;
  transform: Transform;
}

const coreSetupMock = coreMock.createSetup();
const mockEventTracker = eventTrackerMock.create();

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
jest.mock('../content_stream', () => ({
  getContentStream: () => mockStream,
  finishedWithNoPendingCallbacks: () => Promise.resolve(),
}));

jest.mock('../../services/notifications/email_notification_service');

const fakeRawRequest: FakeRawRequest = {
  headers: {
    authorization: `ApiKey skdjtq4u543yt3rhewrh`,
  },
  path: '/',
};

const payload = {
  headers: '',
  title: 'Test Report',
  browserTimezone: '',
  objectType: 'test',
  version: '8.0.0',
};

const scheduledReport: SavedObject<ScheduledReportType> = {
  id: 'report-so-id',
  attributes: {
    createdAt: new Date().toISOString(),
    createdBy: 'test-user',
    enabled: true,
    jobType: 'test1',
    meta: { objectType: 'test' },
    migrationVersion: '8.0.0',
    payload: JSON.stringify(payload),
    schedule: {
      rrule: {
        freq: Frequency.DAILY,
        interval: 2,
        tzid: 'UTC',
        dtstart: '2025-06-04T00:00:00.000Z',
      },
    },
    title: 'Test Report',
    notification: {
      email: {
        to: ['test1@test.com'],
        bcc: ['test2@test.com'],
      },
    },
  },
  references: [],
  type: 'scheduled-report',
};

const savedReportData = {
  _id: '290357209345723095',
  _index: '.reporting-fantastic',
  _seq_no: 23,
  _primary_term: 354000,
  jobtype: 'test1',
  migration_version: '8.0.0',
  payload,
  created_at: new Date().toISOString(),
  created_by: 'test-user',
  meta: { objectType: 'test' },
  scheduled_report_id: 'report-so-id',
  status: JOB_STATUS.PROCESSING,
};

const savedReport = new SavedReport(savedReportData);

describe('Run Scheduled Report Task', () => {
  let mockReporting: ReportingCore;
  let configType: ReportingConfigType;
  let soClient: SavedObjectsClientContract;
  let reportStore: ReportingStore;
  const notifications = notificationsMock.createStart();
  let emailNotificationService: EmailNotificationService;
  let logger: MockedLogger;
  let notifyUsage: jest.Mock<any>;

  const runTaskFn = jest.fn().mockResolvedValue({ content_type: 'application/pdf' });
  beforeEach(async () => {
    configType = createMockConfigSchema();
    mockReporting = await createMockReportingCore(configType);

    soClient = await mockReporting.getInternalSoClient();

    notifyUsage = jest.fn();
    mockReporting.getExportTypesRegistry().register({
      id: 'test1',
      name: 'Test1',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: pdf scheduled export',
      notifyUsage,
      runTask: runTaskFn,
      jobContentEncoding: 'base64',
      jobContentExtension: 'pdf',
      jobType: 'test1',
      validLicenses: [],
    } as unknown as ExportType);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    soClient.get = jest.fn().mockImplementation(async () => {
      return scheduledReport;
    });
    reportStore = await mockReporting.getStore();
    reportStore.addReport = jest.fn().mockImplementation(async () => {
      return savedReport;
    });
    reportStore.setReportError = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'noop',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    reportStore.setReportFailed = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'test1',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    reportStore.setReportWarning = jest.fn();
    emailNotificationService = new EmailNotificationService({
      notifications,
    });
  });

  it('Instance setup', () => {
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxConcurrency": 1,
        "timeout": "120s",
        "title": "Reporting: execute scheduled job",
        "type": "report:execute-scheduled",
      }
    `);
  });

  it('Uses number of attempts as a queueTimeout multiplier', async () => {
    configType = createMockConfigSchema({ capture: { maxAttempts: 3 } });
    mockReporting = await createMockReportingCore(configType);
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxConcurrency": 1,
        "timeout": "360s",
        "title": "Reporting: execute scheduled job",
        "type": "report:execute-scheduled",
      }
    `);
  });

  it('Instance start', () => {
    const mockTaskManager = taskManagerMock.createStart();
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });
    expect(task.init(mockTaskManager, emailNotificationService));
    expect(task.getStatus()).toBe('initialized');
  });

  it('create task runner', async () => {
    logger.info = jest.fn();
    logger.error = jest.fn();

    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });
    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'random-task-id',
        params: { id: 'cool-reporting-id', jobtype: 'test1' },
      },
    } as unknown as RunContext);
    expect(taskRunner).toHaveProperty('run');
    expect(taskRunner).toHaveProperty('cancel');
  });

  it('Max Concurrency is 0 if pollEnabled is false', () => {
    const queueConfig = {
      queue: { pollEnabled: false, timeout: 55000 },
    } as unknown as ReportingConfigType['queue'];

    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: { ...configType, ...queueConfig },
      logger,
    });
    expect(task.getStatus()).toBe('uninitialized');
    expect(task.getTaskDefinition()).toMatchInlineSnapshot(`
      Object {
        "createTaskRunner": [Function],
        "maxConcurrency": 0,
        "timeout": "55s",
        "title": "Reporting: execute scheduled job",
        "type": "report:execute-scheduled",
      }
    `);
  });

  it('schedules task with request', async () => {
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager, emailNotificationService);

    await task.scheduleTask(fakeRawRequest as unknown as KibanaRequest, {
      id: 'report-so-id',
      jobtype: 'test1',
      schedule: {
        rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' },
      } as never,
    });

    expect(mockTaskManager.schedule).toHaveBeenCalledWith(
      {
        id: 'report-so-id',
        taskType: SCHEDULED_REPORTING_EXECUTE_TYPE,
        state: {},
        params: {
          id: 'report-so-id',
          spaceId: 'default',
          jobtype: 'test1',
        },
        schedule: {
          rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' },
        },
      },
      { request: fakeRawRequest }
    );
  });

  it('uses authorization headers from task manager fake request', async () => {
    const runAt = new Date('2023-10-01T00:00:00Z');
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });

    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunScheduledReportTask instance
      .spyOn(task, 'completeJob')
      .mockResolvedValueOnce({ _id: 'test', jobtype: 'test1', status: 'pending' } as never);
    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager, emailNotificationService);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'report-so-id',
        runAt,
        params: {
          id: 'report-so-id',
          jobtype: 'test1',
          schedule: {
            rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' },
          },
        },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await taskRunner.run();

    expect(notifyUsage).toHaveBeenCalledWith('scheduled');

    expect(soClient.get).toHaveBeenCalledWith('scheduled_report', 'report-so-id', {
      namespace: 'default',
    });
    expect(reportStore.addReport).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(String),
        _index: '.kibana-reporting',
        jobtype: 'test1',
        created_at: expect.any(String),
        created_by: 'test-user',
        payload: {
          headers: '',
          title: expect.any(String),
          browserTimezone: '',
          objectType: 'test',
          version: '8.0.0',
          forceNow: expect.any(String),
        },
        meta: { objectType: 'test' },
        status: 'processing',
        attempts: 1,
        scheduled_report_id: 'report-so-id',
        kibana_name: 'kibana',
        kibana_id: 'instance-uuid',
        started_at: expect.any(String),
        space_id: 'default',
        timeout: 120000,
        max_attempts: 1,
        process_expiration: expect.any(String),
        migration_version: '7.14.0',
      })
    );
    expect(runTaskFn.mock.calls[0][0].request.headers).toEqual({
      authorization: 'ApiKey skdjtq4u543yt3rhewrh',
    });
  });

  it('sends telemetry event when job is claimed', async () => {
    const store = await mockReporting.getStore();
    store.addReport = jest.fn().mockImplementation(
      (report) =>
        new SavedReport({
          ...report,
          _id: 'test',
          _index: '.reporting-foo-index-234',
          _seq_no: 1,
          _primary_term: 1,
          jobtype: 'test1',
          payload: { objectType: 'dashboard' },
        })
    );

    mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });
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
        runAt: new Date(),
        params: { index: 'cool-reporting-index', id: 'test1', jobtype: 'test1', payload: {} },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await taskRunner.run();

    expect(notifyUsage).toHaveBeenCalledWith('scheduled');
    expect(mockReporting.getEventTracker).toHaveBeenCalledWith('test', 'test1', 'dashboard');
    expect(mockEventTracker.claimJob).toHaveBeenCalledWith({
      timeSinceCreation: expect.any(Number),
      scheduleType: 'scheduled',
      scheduledTaskId: 'report-so-id',
    });
  });

  it('throws if no fake request from task', async () => {
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });

    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager, emailNotificationService);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'report-so-id',
        runAt: new Date('2023-10-01T00:00:00Z'),
        params: {
          id: 'report-so-id',
          jobtype: 'test1',
          schedule: {
            rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' },
          },
        },
      },
      fakeRequest: undefined,
    } as unknown as RunContext);

    await expect(taskRunner.run()).rejects.toThrowErrorMatchingInlineSnapshot(
      `"ReportingError(code: missing_authentication_header_error)"`
    );

    expect(notifyUsage).not.toHaveBeenCalledWith();
    expect(soClient.get).toHaveBeenCalled();
    expect(reportStore.addReport).toHaveBeenCalled();

    expect(reportStore.setReportFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: '290357209345723095',
      }),
      expect.objectContaining({
        error: expect.objectContaining({
          message: `ReportingError(code: missing_authentication_header_error)`,
        }),
      })
    );
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
      getFeatureUsageName: () => 'Reporting: pdf scheduled export',
      notifyUsage: jest.fn(),
      jobContentExtension: 'pdf',
      jobType: 'noop',
      validLicenses: [],
    } as unknown as ExportType);
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });

    jest
      // @ts-expect-error TS compilation fails: this overrides a private method of the RunScheduledReportTask instance
      .spyOn(task, 'prepareJob')
      .mockResolvedValueOnce({
        isLastAttempt: false,
        jobId: '290357209345723095',
        report: { _id: '290357209345723095', jobtype: 'noop' },
        task: {
          id: '290357209345723095',
          index: '.reporting-fantastic',
          jobtype: 'noop',
          payload,
        },
      } as never);

    jest
      // @ts-expect-error TS compilation fails: this overrides a protected method of the RunSingleReportTask instance
      .spyOn(task, 'getEventTracker')
      // @ts-ignore
      .mockReturnValue(new EventTracker(coreSetupMock.analytics, 'jobId', 'exportTypeId', 'appId'));

    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager, emailNotificationService);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'report-so-id',
        params: {
          id: 'report-so-id',
          jobtype: 'test1',
          schedule: {
            rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' },
          },
        },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    const taskPromise = taskRunner.run();
    setImmediate(() => {
      mockReporting.pluginStop();
    });
    await taskPromise.catch(() => {});

    expect(reportStore.setReportFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: '290357209345723095',
      }),
      expect.objectContaining({
        error: expect.objectContaining({
          message: `ReportingError(code: ${new KibanaShuttingDownError().code})`,
        }),
      })
    );
  });

  it('updates report with error message and failed status if error occurs during task run', async () => {
    const runAt = new Date('2023-10-01T00:00:00Z');

    const runThisTaskFn = jest.fn().mockImplementation(() => {
      throw new Error('failure generating report');
    });
    mockReporting.getExportTypesRegistry().register({
      id: 'test2',
      name: 'Test2',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runThisTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test2 scheduled export',
      notifyUsage: jest.fn(),
      jobContentEncoding: 'base64',
      jobType: 'test2',
      validLicenses: [],
    } as unknown as ExportType);
    const store = await mockReporting.getStore();
    const thisSavedReport = new SavedReport({ ...savedReportData, jobtype: 'test2' });
    store.addReport = jest.fn().mockImplementation(async () => thisSavedReport);
    store.setReportFailed = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'test1',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    store.setReportError = jest.fn();

    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });

    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager, emailNotificationService);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'report-so-id',
        runAt,
        params: {
          id: 'report-so-id',
          jobtype: 'test2',
          schedule: {
            rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' },
          },
        },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await expect(() => taskRunner.run()).rejects.toThrowError('failure generating report');

    expect(logger.error).toHaveBeenCalledWith(
      new Error(
        `Saving execution error for test2 job 290357209345723095: Error: failure generating report`
      ),
      { tags: [thisSavedReport._id] }
    );
    expect(store.setReportError).not.toHaveBeenCalled();
    expect(store.setReportFailed).toHaveBeenCalledWith(thisSavedReport, {
      output: {
        content: `ReportingError(code: unknown_error) \"failure generating report\"`,
        content_type: null,
        error_code: 'unknown_error',
        size: 63,
        warnings: [`ReportingError(code: unknown_error) \"failure generating report\"`],
      },
      completed_at: expect.any(String),
      error: expect.objectContaining({ name: 'Error', message: 'failure generating report' }),
    });
  });

  it('should retry up to maxRetries', async () => {
    const runAt = new Date('2023-10-01T00:00:00Z');
    configType = createMockConfigSchema({ capture: { maxAttempts: 2 } });
    mockReporting = await createMockReportingCore(configType);
    const runThisTaskFn = jest.fn().mockImplementation(() => {
      throw new Error('failure generating report');
    });
    mockReporting.getExportTypesRegistry().register({
      id: 'test2',
      name: 'Test2',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runThisTaskFn,
      shouldNotifyUsage: () => true,
      getFeatureUsageName: () => 'Reporting: test2 scheduled export',
      notifyUsage: jest.fn(),
      jobContentEncoding: 'base64',
      jobType: 'test2',
      validLicenses: [],
    } as unknown as ExportType);
    const store = await mockReporting.getStore();
    const thisSavedReport = new SavedReport({ ...savedReportData, jobtype: 'test2' });
    store.addReport = jest.fn().mockImplementation(async () => thisSavedReport);
    store.setReportFailed = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'test1',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });

    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager, emailNotificationService);

    const taskDef = task.getTaskDefinition();
    const taskRunner = taskDef.createTaskRunner({
      taskInstance: {
        id: 'report-so-id',
        runAt,
        params: {
          id: 'report-so-id',
          jobtype: 'test2',
          schedule: {
            rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' },
          },
        },
      },
      fakeRequest: fakeRawRequest,
    } as unknown as RunContext);

    await expect(() => taskRunner.run()).rejects.toThrowError('failure generating report');

    expect(runThisTaskFn).toHaveBeenCalledTimes(2); // should retry 2 times
    expect(logger.error).toHaveBeenCalledWith(
      new Error(
        `Saving execution error for test2 job 290357209345723095: Error: failure generating report`
      ),
      { tags: [thisSavedReport._id] }
    );
    expect(store.setReportFailed).toHaveBeenCalledWith(thisSavedReport, {
      output: {
        content: `ReportingError(code: unknown_error) \"failure generating report\"`,
        content_type: null,
        error_code: 'unknown_error',
        size: 63,
        warnings: [`ReportingError(code: unknown_error) \"failure generating report\"`],
      },
      completed_at: expect.any(String),
      error: expect.objectContaining({ name: 'Error', message: 'failure generating report' }),
    });
  });

  describe('notify', () => {
    it('sends an email notification', async () => {
      mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 2097152; // 2MB
      const output = { content_type: 'application/pdf' };

      // @ts-expect-error
      await task.notify(savedReport, taskInstance, output, byteSize, scheduledReport, 'default');
      expect(soClient.get).not.toHaveBeenCalled();
      expect(emailNotificationService.notify).toHaveBeenCalledWith({
        contentType: 'application/pdf',
        emailParams: {
          bcc: ['test2@test.com'],
          cc: undefined,
          message: 'Your scheduled report is attached for you to download or share.',
          spaceId: 'default',
          subject: 'Test Report-2025-06-04T00:00:00.000Z scheduled report',
          to: ['test1@test.com'],
        },
        filename: 'Test Report-2025-06-04T00:00:00.000Z.pdf',
        id: '290357209345723095',
        index: '.reporting-fantastic',
        relatedObject: {
          id: 'report-so-id',
          namespace: 'default',
          type: 'scheduled-report',
        },
        reporting: mockReporting,
      });
      expect(mockReporting.getEventTracker).toHaveBeenCalledWith(
        '290357209345723095',
        'test1',
        'test'
      );
      expect(mockEventTracker.completeNotification).toHaveBeenCalledWith({
        byteSize: 2097152,
        scheduleType: 'scheduled',
        scheduledTaskId: 'report-so-id',
      });
    });

    it('handles invalid email template errors, reporting them in the notification text', async () => {
      mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 2097152; // 2MB
      const output = {
        content_type: 'application/pdf',
        csv_contains_formulas: false,
        max_size_reached: false,
        metrics: {
          pdf: {
            cpu: 0.11005001073746828,
            cpuInPercentage: 11.01,
            memory: 347602944,
            memoryInMegabytes: 331.5,
          },
        },
      };

      // @ts-expect-error
      await task.notify(
        savedReport,
        // @ts-expect-error
        taskInstance,
        output,
        byteSize,
        {
          ...scheduledReport,
          attributes: {
            ...scheduledReport.attributes,
            notification: {
              email: {
                ...scheduledReport.attributes.notification!.email,
                subject: 'Invalid report subject: {{',
              },
            },
          },
        },
        'default'
      );
      expect(soClient.get).not.toHaveBeenCalled();
      expect(emailNotificationService.notify).toHaveBeenCalledWith({
        contentType: 'application/pdf',
        emailParams: {
          bcc: ['test2@test.com'],
          cc: undefined,
          spaceId: 'default',
          to: ['test1@test.com'],
          subject:
            'error rendering mustache template "Invalid report subject: {{": Unclosed tag at 26',
          message: 'Your scheduled report is attached for you to download or share.',
        },
        filename: 'Test Report-2025-06-04T00:00:00.000Z.pdf',
        id: '290357209345723095',
        index: '.reporting-fantastic',
        relatedObject: {
          id: 'report-so-id',
          namespace: 'default',
          type: 'scheduled-report',
        },
        reporting: mockReporting,
      });
      expect(mockReporting.getEventTracker).toHaveBeenCalledWith(
        '290357209345723095',
        'test1',
        'test'
      );
      expect(mockEventTracker.completeNotification).toHaveBeenCalledWith({
        byteSize: 2097152,
        scheduleType: 'scheduled',
        scheduledTaskId: 'report-so-id',
      });
    });

    it('sends an email notification with template variables in subject and body', async () => {
      mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 2097152; // 2MB
      const output = {
        content_type: 'application/pdf',
        csv_contains_formulas: false,
        max_size_reached: false,
        metrics: {
          pdf: {
            cpu: 0.11005001073746828,
            cpuInPercentage: 11.01,
            memory: 347602944,
            memoryInMegabytes: 331.5,
          },
        },
      };

      // @ts-expect-error
      await task.notify(
        savedReport,
        // @ts-expect-error
        taskInstance,
        output,
        byteSize,
        {
          ...scheduledReport,
          attributes: {
            ...scheduledReport.attributes,
            notification: {
              email: {
                ...scheduledReport.attributes.notification!.email,
                subject: 'Scheduled Report: {{title}} - {{date}}',
                message: `
                # Your report is ready

                - title: {{title}}
                - filename: {{filename}}
                - objectType: {{objectType}}
                - date: {{date}}
                `,
              },
            },
          },
        },
        'default'
      );
      expect(soClient.get).not.toHaveBeenCalled();
      expect(emailNotificationService.notify).toHaveBeenCalledWith({
        contentType: 'application/pdf',
        emailParams: {
          bcc: ['test2@test.com'],
          cc: undefined,
          spaceId: 'default',
          to: ['test1@test.com'],
          subject: 'Scheduled Report: Test Report - 2025-06-04T00:00:00.000Z',
          message: `
                # Your report is ready

                - title: Test Report
                - filename: Test Report\\-2025\\-06\\-04T00:00:00\\.000Z\\.pdf
                - objectType: test
                - date: 2025\\-06\\-04T00:00:00\\.000Z
                `,
        },
        filename: 'Test Report-2025-06-04T00:00:00.000Z.pdf',
        id: '290357209345723095',
        index: '.reporting-fantastic',
        relatedObject: {
          id: 'report-so-id',
          namespace: 'default',
          type: 'scheduled-report',
        },
        reporting: mockReporting,
      });
      expect(mockReporting.getEventTracker).toHaveBeenCalledWith(
        '290357209345723095',
        'test1',
        'test'
      );
      expect(mockEventTracker.completeNotification).toHaveBeenCalledWith({
        byteSize: 2097152,
        scheduleType: 'scheduled',
        scheduledTaskId: 'report-so-id',
      });
    });

    it("gets the scheduled_report saved object if it's not defined", async () => {
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 2097152; // 2MB
      const output = { content_type: 'application/pdf' };

      // @ts-expect-error
      await task.notify(savedReport, taskInstance, output, byteSize, undefined, 'default');
      expect(soClient.get).toHaveBeenCalled();
      expect(emailNotificationService.notify).toHaveBeenCalledWith({
        contentType: 'application/pdf',
        emailParams: {
          bcc: ['test2@test.com'],
          cc: undefined,
          message: 'Your scheduled report is attached for you to download or share.',
          spaceId: 'default',
          subject: 'Test Report-2025-06-04T00:00:00.000Z scheduled report',
          to: ['test1@test.com'],
        },
        filename: 'Test Report-2025-06-04T00:00:00.000Z.pdf',
        id: '290357209345723095',
        index: '.reporting-fantastic',
        relatedObject: {
          id: 'report-so-id',
          namespace: 'default',
          type: 'scheduled-report',
        },
        reporting: mockReporting,
      });
    });

    it('does not send an email notification if the notification is not defined', async () => {
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 2097152; // 2MB
      const output = { content_type: 'application/pdf' };
      const noNotification = { ...scheduledReport, notification: undefined };

      // @ts-expect-error
      await task.notify(savedReport, taskInstance, output, byteSize, noNotification, 'default');
      expect(soClient.get).not.toHaveBeenCalled();
      expect(emailNotificationService.notify).not.toHaveBeenCalledWith();
    });

    it('logs a warning and sets the execution to warning when the report is larger than 10MB', async () => {
      mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 11534336; // 11MB
      const output = { content_type: 'application/pdf' };

      // @ts-expect-error
      await task.notify(savedReport, taskInstance, output, byteSize, scheduledReport, 'default');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emailNotificationService.notify).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Error sending notification for scheduled report: The report is larger than the 10MB limit.',
        { tags: [savedReport._id] }
      );
      expect(reportStore.setReportWarning).toHaveBeenCalledWith(savedReport, {
        output: { content_type: 'application/pdf', size: 11534336 },
        warning:
          'Error sending notification for scheduled report: The report is larger than the 10MB limit.',
      });
      expect(mockReporting.getEventTracker).toHaveBeenCalledWith(
        '290357209345723095',
        'test1',
        'test'
      );
      expect(mockEventTracker.failedNotification).toHaveBeenCalledWith({
        byteSize: 11534336,
        scheduleType: 'scheduled',
        scheduledTaskId: 'report-so-id',
        errorMessage:
          'Error sending notification for scheduled report: The report is larger than the 10MB limit.',
      });
    });

    it('logs a warning and sets the execution to warning when the notification service is not initialized', async () => {
      mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 2097152; // 2MB
      const output = { content_type: 'application/pdf' };

      // @ts-expect-error
      await task.notify(savedReport, taskInstance, output, byteSize, scheduledReport, 'default');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emailNotificationService.notify).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Error sending notification for scheduled report: Reporting notification service has not been initialized.',
        { tags: [savedReport._id] }
      );
      expect(reportStore.setReportWarning).toHaveBeenCalledWith(savedReport, {
        output: { content_type: 'application/pdf', size: 2097152 },
        warning:
          'Error sending notification for scheduled report: Reporting notification service has not been initialized.',
      });
      expect(mockReporting.getEventTracker).toHaveBeenCalledWith(
        '290357209345723095',
        'test1',
        'test'
      );
      expect(mockEventTracker.failedNotification).toHaveBeenCalledWith({
        byteSize: 2097152,
        scheduleType: 'scheduled',
        scheduledTaskId: 'report-so-id',
        errorMessage:
          'Error sending notification for scheduled report: Reporting notification service has not been initialized.',
      });
    });

    it('logs a warning and sets the execution to warning if the notification service throws an error', async () => {
      mockReporting.getEventTracker = jest.fn().mockReturnValue(mockEventTracker);
      jest
        .spyOn(emailNotificationService, 'notify')
        .mockRejectedValueOnce(new Error('This is a test error!'));
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 2097152; // 2MB
      const output = { content_type: 'application/pdf' };

      // @ts-expect-error
      await task.notify(savedReport, taskInstance, output, byteSize, scheduledReport, 'default');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emailNotificationService.notify).toHaveBeenCalledWith({
        contentType: 'application/pdf',
        emailParams: {
          bcc: ['test2@test.com'],
          cc: undefined,
          message: 'Your scheduled report is attached for you to download or share.',
          spaceId: 'default',
          subject: 'Test Report-2025-06-04T00:00:00.000Z scheduled report',
          to: ['test1@test.com'],
        },
        filename: 'Test Report-2025-06-04T00:00:00.000Z.pdf',
        id: '290357209345723095',
        index: '.reporting-fantastic',
        relatedObject: {
          id: 'report-so-id',
          namespace: 'default',
          type: 'scheduled-report',
        },
        reporting: mockReporting,
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Error sending notification for scheduled report: This is a test error!',
        { tags: [savedReport._id] }
      );
      expect(reportStore.setReportWarning).toHaveBeenCalledWith(savedReport, {
        output: { content_type: 'application/pdf', size: 2097152 },
        warning: 'Error sending notification for scheduled report: This is a test error!',
      });
      expect(mockReporting.getEventTracker).toHaveBeenCalledWith(
        '290357209345723095',
        'test1',
        'test'
      );
      expect(mockEventTracker.failedNotification).toHaveBeenCalledWith({
        byteSize: 2097152,
        scheduleType: 'scheduled',
        scheduledTaskId: 'report-so-id',
        errorMessage: 'Error sending notification for scheduled report: This is a test error!',
      });
    });

    it('logs an error if there is an error thrown setting execution to warning', async () => {
      jest
        .spyOn(reportStore, 'setReportWarning')
        .mockRejectedValueOnce('Error setting status to warning');
      const task = new RunScheduledReportTask({
        reporting: mockReporting,
        config: configType,
        logger,
      });
      const mockTaskManager = taskManagerMock.createStart();
      await task.init(mockTaskManager, emailNotificationService);
      const taskInstance = {
        id: 'task-id',
        runAt: new Date('2025-06-04T00:00:00Z'),
        params: { id: 'report-so-id', jobtype: 'test1' },
      };
      const byteSize = 11534336; // 11MB
      const output = { content_type: 'application/pdf' };

      // @ts-expect-error
      await task.notify(savedReport, taskInstance, output, byteSize, scheduledReport, 'default');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(emailNotificationService.notify).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
