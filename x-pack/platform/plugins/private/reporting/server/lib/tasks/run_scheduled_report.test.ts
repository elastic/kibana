/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';
import type { estypes } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { JOB_STATUS, KibanaShuttingDownError } from '@kbn/reporting-common';
import { ReportDocument } from '@kbn/reporting-common/types';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { type ExportType, type ReportingConfigType } from '@kbn/reporting-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

import { RunScheduledReportTask, SCHEDULED_REPORTING_EXECUTE_TYPE } from '.';
import { ReportingCore } from '../..';
import { createMockReportingCore } from '../../test_helpers';
import {
  FakeRawRequest,
  KibanaRequest,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { Frequency } from '@kbn/rrule';
import { ReportingStore, SavedReport } from '../store';
import { ScheduledReport } from '../../types';

interface StreamMock {
  getSeqNo: () => number;
  getPrimaryTerm: () => number;
  write: (data: string) => void;
  fail: () => void;
  end: () => void;
  transform: Transform;
}

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

const logger = loggingSystemMock.createLogger();
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

const reportSO: SavedObject<ScheduledReport> = {
  id: 'report-so-id',
  attributes: {
    createdAt: new Date().toISOString(),
    createdBy: 'test-user',
    enabled: true,
    jobType: 'test1',
    meta: { objectType: 'test' },
    migrationVersion: '8.0.0',
    payload: JSON.stringify(payload),
    schedule: { rrule: { freq: Frequency.DAILY, interval: 2, tzid: 'UTC' } },
    title: 'Test Report',
  },
  references: [],
  type: 'scheduled-report',
};

describe('Run Scheduled Report Task', () => {
  let mockReporting: ReportingCore;
  let configType: ReportingConfigType;
  let soClient: SavedObjectsClientContract;
  let reportStore: ReportingStore;

  const runTaskFn = jest.fn().mockResolvedValue({ content_type: 'application/pdf' });
  beforeAll(async () => {
    configType = createMockConfigSchema();
    mockReporting = await createMockReportingCore(configType);

    soClient = await mockReporting.getSoClient();
    soClient.get = jest.fn().mockImplementation(async () => {
      return reportSO;
    });

    mockReporting.getExportTypesRegistry().register({
      id: 'test1',
      name: 'Test1',
      setup: jest.fn(),
      start: jest.fn(),
      createJob: () => new Promise(() => {}),
      runTask: runTaskFn,
      jobContentEncoding: 'base64',
      jobType: 'test1',
      validLicenses: [],
    } as unknown as ExportType);
  });

  beforeEach(async () => {
    reportStore = await mockReporting.getStore();
    reportStore.addReport = jest.fn().mockImplementation(async () => {
      return new SavedReport({
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
      });
    });
    reportStore.setReportError = jest.fn(() =>
      Promise.resolve({
        _id: 'test',
        jobtype: 'noop',
        status: 'processing',
      } as unknown as estypes.UpdateUpdateWriteResponseBase<ReportDocument>)
    );
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

  it('Instance start', () => {
    const mockTaskManager = taskManagerMock.createStart();
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });
    expect(task.init(mockTaskManager));
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
    await task.init(mockTaskManager);

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
    await task.init(mockTaskManager);

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

    expect(soClient.get).toHaveBeenCalledWith('scheduled_report', 'report-so-id');
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

  it('throws if no fake request from task', async () => {
    const task = new RunScheduledReportTask({
      reporting: mockReporting,
      config: configType,
      logger,
    });

    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

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

    expect(soClient.get).toHaveBeenCalled();
    expect(reportStore.addReport).toHaveBeenCalled();

    expect(reportStore.setReportError).toHaveBeenLastCalledWith(
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

    const mockTaskManager = taskManagerMock.createStart();
    await task.init(mockTaskManager);

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

    expect(reportStore.setReportError).toHaveBeenLastCalledWith(
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
});
