/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { isUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  APPLY_TASK_TYPE,
  MAX_REPORTED_ERRORS,
  MAX_REPORTED_MESSAGE_LENGTH,
  type BootstrapError,
  type BootstrapStatusAttributes,
  type KindResult,
} from '../../common';
import { applyBootstrap } from '../apply/apply_bootstrap';
import {
  hashSettings,
  MAX_LOGGED_ERRORS,
  readExpectation,
  type RunExpectation,
} from '../bootstrap/run_bootstrap';
import { pruneOwned } from '../ownership/prune_owned';
import { BootstrapReadError, readBootstrapFiles } from '../reader/read_bootstrap_files';
import { config } from '../config';
import { LockAcquisitionError } from '@kbn/lock-manager';
import {
  APPLY_LOCK_ID,
  BUSY_RETRY_DELAY_MS,
  MAX_DEFERRALS,
  registerApplyTaskDefinition,
  scheduleApplyTask,
  scheduleApplyTaskWithRetry,
  SCHEDULE_RETRY_OPTIONS,
  toTaskTimeout,
} from './apply_resources_task';

jest.mock('../apply/apply_bootstrap');
jest.mock('../ownership/prune_owned', () => ({
  ...jest.requireActual('../ownership/prune_owned'),
  pruneOwned: jest.fn(),
}));
jest.mock('../reader/read_bootstrap_files', () => ({
  ...jest.requireActual('../reader/read_bootstrap_files'),
  readBootstrapFiles: jest.fn(),
}));

const mockedApply = applyBootstrap as jest.MockedFunction<typeof applyBootstrap>;
const mockedPrune = pruneOwned as jest.MockedFunction<typeof pruneOwned>;
const mockedRead = readBootstrapFiles as jest.MockedFunction<typeof readBootstrapFiles>;

const timeoutOf = (value: string) => config.schema.validate({ timeout: value }).timeout;

describe('apply task timeout', () => {
  it.each([
    ['10m', '600s'],
    ['90s', '90s'],
    ['1h', '3600s'],
    ['10s', '10s'],
  ])('expresses %s to Task Manager as %s', (configured, expected) => {
    expect(toTaskTimeout(timeoutOf(configured))).toBe(expected);
  });

  it('registers the task with the configured timeout, not a fixed one', () => {
    const taskManager = taskManagerMock.createSetup();

    registerApplyTaskDefinition({
      taskManager,
      getServices: () => {
        throw new Error('not needed to register');
      },
      timeout: timeoutOf('45m'),
      maxAttempts: 3,
    });

    const [[definitions]] = taskManager.registerTaskDefinitions.mock.calls;
    expect(definitions[APPLY_TASK_TYPE].timeout).toBe('2700s');
  });

  it('registers the task with the configured attempts, not Task Manager default', () => {
    const taskManager = taskManagerMock.createSetup();

    registerApplyTaskDefinition({
      taskManager,
      getServices: () => {
        throw new Error('not needed to register');
      },
      timeout: timeoutOf('10m'),
      maxAttempts: 5,
    });

    const [[definitions]] = taskManager.registerTaskDefinitions.mock.calls;
    expect(definitions[APPLY_TASK_TYPE].maxAttempts).toBe(5);
  });

  it('defaults to ten minutes', () => {
    expect(toTaskTimeout(config.schema.validate({}).timeout)).toBe('600s');
  });
});

const seen: RunExpectation = { filesHash: 'h1', settingsHash: 's1' };
const readSeen = async () => seen;

describe('scheduleApplyTask', () => {
  it('asks for a run of its own, numbered by the requests counter, with what it sees', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.schedule.mockResolvedValue({ id: 'generated' } as never);
    const requests = { next: jest.fn(async () => 4) };

    await expect(
      scheduleApplyTask({ taskManager, requests, readExpectation: readSeen })
    ).resolves.toBe('generated');

    const [[task]] = taskManager.schedule.mock.calls;
    expect(task).toEqual({
      taskType: APPLY_TASK_TYPE,
      params: { requestNumber: 4, expected: seen },
      state: { deferrals: 0 },
    });
    expect(task.id).toBeUndefined();
  });

  it('does not schedule a run when no number could be taken', async () => {
    const taskManager = taskManagerMock.createStart();
    const requests = { next: jest.fn(async () => Promise.reject(new Error('es down'))) };

    await expect(
      scheduleApplyTask({ taskManager, requests, readExpectation: readSeen })
    ).rejects.toThrow('es down');
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  it('does not schedule a run when what it sees could not be read', async () => {
    const taskManager = taskManagerMock.createStart();
    const requests = { next: jest.fn(async () => 4) };
    const readExpectationFails = async () => Promise.reject(new Error('boom'));

    await expect(
      scheduleApplyTask({ taskManager, requests, readExpectation: readExpectationFails })
    ).rejects.toThrow('boom');
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });
});

describe('readExpectation', () => {
  const kibanaVersion = '9.4.0';
  const readConfig = {
    path: '/files',
    managed: true,
    prune: false,
    maxFileSize: { getValueInBytes: () => 1 },
    maxTotalSize: { getValueInBytes: () => 1 },
    maxFiles: 1,
  } as never;
  const settingsHash = hashSettings({ managed: true, prune: false, kibanaVersion });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hashes the files and the settings, as a run does', async () => {
    mockedRead.mockResolvedValueOnce({ hash: 'h1', groups: [] });

    await expect(readExpectation({ config: readConfig, kibanaVersion })).resolves.toEqual({
      filesHash: 'h1',
      settingsHash,
    });
  });

  it.each([
    ['the hash of files with invalid content', new BootstrapReadError(['bad'], 'h2'), 'h2'],
    ['no hash for files it could not read', new BootstrapReadError(['/files: EIO']), null],
  ])('takes %s', async (_name, error, filesHash) => {
    mockedRead.mockRejectedValueOnce(error);

    await expect(readExpectation({ config: readConfig, kibanaVersion })).resolves.toEqual({
      filesHash,
      settingsHash,
    });
  });

  it('fails when reading the files fails unexpectedly', async () => {
    mockedRead.mockRejectedValueOnce(new Error('boom'));

    await expect(readExpectation({ config: readConfig, kibanaVersion })).rejects.toThrow('boom');
  });
});

describe('scheduleApplyTaskWithRetry', () => {
  const { minTimeout } = SCHEDULE_RETRY_OPTIONS;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const setup = () => {
    const taskManager = taskManagerMock.createStart();
    let count = 0;
    const requests = { next: jest.fn(async () => ++count) };
    const logger = loggerMock.create();
    const controller = new AbortController();
    return { taskManager, requests, logger, controller };
  };

  it('schedules again after a failure, once the backoff has passed', async () => {
    const { taskManager, requests, logger, controller } = setup();
    taskManager.schedule
      .mockRejectedValueOnce(new Error('task manager unavailable'))
      .mockResolvedValue({ id: 'generated' } as never);

    const scheduled = scheduleApplyTaskWithRetry({
      taskManager,
      requests,
      readExpectation: readSeen,
      logger,
      signal: controller.signal,
    });

    await jest.advanceTimersByTimeAsync(minTimeout - 1);
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to schedule the resource bootstrap (attempt 1), retrying: task manager unavailable'
    );

    await jest.advanceTimersByTimeAsync(1);
    await expect(scheduled).resolves.toBe('generated');
    expect(taskManager.schedule).toHaveBeenCalledTimes(2);
    expect(taskManager.schedule.mock.calls[1][0].params).toEqual({
      requestNumber: 2,
      expected: seen,
    });
  });

  it('keeps retrying while no number can be taken', async () => {
    const { taskManager, requests, logger, controller } = setup();
    requests.next
      .mockRejectedValueOnce(new Error('es down'))
      .mockRejectedValueOnce(new Error('es down'));
    taskManager.schedule.mockResolvedValue({ id: 'generated' } as never);

    const scheduled = scheduleApplyTaskWithRetry({
      taskManager,
      requests,
      readExpectation: readSeen,
      logger,
      signal: controller.signal,
    });
    await jest.advanceTimersByTimeAsync(minTimeout * 3);

    await expect(scheduled).resolves.toBe('generated');
    expect(requests.next).toHaveBeenCalledTimes(3);
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
  });

  it('stops retrying once aborted', async () => {
    const { taskManager, requests, logger, controller } = setup();
    taskManager.schedule.mockRejectedValue(new Error('task manager unavailable'));

    const scheduled = scheduleApplyTaskWithRetry({
      taskManager,
      requests,
      readExpectation: readSeen,
      logger,
      signal: controller.signal,
    });
    const rejected = expect(scheduled).rejects.toThrow('Kibana is stopping');
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    await jest.advanceTimersByTimeAsync(minTimeout);

    await rejected;
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
  });
});

describe('apply task run', () => {
  const hash = 'h1';
  const kibanaVersion = '9.4.0';
  let requestNumber = 5;
  // The highest number taken when the run reads the counter; later starts may have taken more.
  let latestRequestNumber = requestNumber;
  const requests = { latest: jest.fn(async () => latestRequestNumber) };
  const status = {
    get: jest.fn<Promise<BootstrapStatusAttributes | undefined>, []>(async () => undefined),
    set: jest.fn(async (_attributes: BootstrapStatusAttributes) => {}),
  };
  let prune = false;
  let reapplyOnStart = true;
  // What the instance that asked for the run saw, when it differs from what this run sees, and how
  // often runs left it to another instance.
  let expected: RunExpectation | undefined;
  // The files hash this run sees: `null` or the read error's hash when the files cannot be read.
  let seenFilesHash: string | null = hash;
  let deferrals = 0;
  let insideLock = false;
  const logger = loggerMock.create();
  const ownedItem = { docId: 'doc-a', entry: { kind: 'data_view', id: 'a', spaces: ['default'] } };
  const ledger = { list: jest.fn(async () => [ownedItem]) };
  const lockManager = {
    withLock: jest.fn(async <T>(_lockId: string, callback: () => Promise<T>) => {
      insideLock = true;
      try {
        return await callback();
      } finally {
        insideLock = false;
      }
    }),
  };

  const runTask = async (
    outcome: {
      status: 'completed' | 'failed';
      errors: BootstrapError[];
      retryable?: boolean;
      kinds?: Record<string, KindResult>;
    },
    signal: AbortSignal = new AbortController().signal
  ) => {
    mockedApply.mockResolvedValue({
      retryable: true,
      kinds: {},
      ...outcome,
      declared: new Set(),
    });
    const taskManager = taskManagerMock.createSetup();
    registerApplyTaskDefinition({
      taskManager,
      getServices: () =>
        ({
          config: {
            path: '/files',
            managed: true,
            prune,
            reapplyOnStart,
            maxFileSize: { getValueInBytes: () => 1 },
            maxTotalSize: { getValueInBytes: () => 1 },
            maxFiles: 1,
          },
          ledger,
          kibanaVersion,
          requests,
          lockManager,
          logger,
          registry: {},
          status,
        } as never),
      timeout: timeoutOf('10m'),
      maxAttempts: 3,
    });
    const [[definitions]] = taskManager.registerTaskDefinitions.mock.calls;
    const runner = definitions[APPLY_TASK_TYPE].createTaskRunner({
      taskInstance: {
        params: {
          requestNumber,
          expected: expected ?? {
            filesHash: seenFilesHash,
            settingsHash: hashSettings({ managed: true, prune, kibanaVersion }),
          },
        },
        state: { deferrals },
      },
      abortController: new AbortController(),
      signal,
    } as never);
    return runner.run();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    requestNumber = 5;
    latestRequestNumber = requestNumber;
    prune = false;
    reapplyOnStart = true;
    expected = undefined;
    seenFilesHash = hash;
    deferrals = 0;
    mockedRead.mockResolvedValue({ hash, groups: [] });
    mockedPrune.mockResolvedValue({ pruned: {}, errors: [] });
  });

  it('deletes the task after a run without errors', async () => {
    await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
      state: { deferrals: 0 },
      shouldDeleteTask: true,
    });
  });

  it('records the failure and then asks Task Manager to retry when resources failed', async () => {
    await expect(
      runTask({ status: 'failed', errors: [{ kind: 'k', spaceId: 's', message: 'm' }] })
    ).rejects.toBeDefined();

    expect(status.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('does not retry a run whose only errors a retry cannot fix', async () => {
    const error = await runTask({
      status: 'failed',
      retryable: false,
      errors: [{ kind: 'k', message: 'No resource kind "k" is registered' }],
    }).catch((e) => e);

    expect(isUnrecoverableError(error)).toBe(true);
    expect(status.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('retries when everything applied but pruning left errors, which may go away', async () => {
    const pruneError = { kind: 'dashboard', spaceId: 'default', message: 'es down' };
    mockedPrune.mockResolvedValue({ pruned: {}, errors: [pruneError] });

    const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

    expect(error).toBeDefined();
    expect(isUnrecoverableError(error)).toBe(false);
    expect(status.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', errors: [pruneError] })
    );
  });

  it('counts every error in the task error, while the status keeps only the first ones', async () => {
    const errors = Array.from({ length: 150 }, (_, index) => ({
      kind: 'k',
      spaceId: 's',
      message: `m${index}`,
    }));

    const error = await runTask({ status: 'failed', errors }).catch((e) => e);

    expect(error.message).toContain('150 errors');
    const [attributes] = status.set.mock.calls[status.set.mock.calls.length - 1];
    expect(attributes.errors).toHaveLength(MAX_REPORTED_ERRORS);
  });

  it('shortens long error messages in the status and the logs', async () => {
    const long = 'x'.repeat(MAX_REPORTED_MESSAGE_LENGTH + 1);
    const shortened = `${'x'.repeat(MAX_REPORTED_MESSAGE_LENGTH)}…`;

    await runTask({
      status: 'failed',
      errors: [
        { kind: 'k', spaceId: 's', id: 'a', message: long },
        { kind: 'k', spaceId: 's', message: 'short' },
      ],
    }).catch(() => undefined);

    const [attributes] = status.set.mock.calls[status.set.mock.calls.length - 1];
    expect(attributes.errors).toEqual([
      { kind: 'k', spaceId: 's', id: 'a', message: shortened },
      { kind: 'k', spaceId: 's', message: 'short' },
    ]);
    const [[message]] = logger.warn.mock.calls;
    expect(String(message)).toContain(`- k "a" in space "s": ${shortened}\n`);
  });

  it('logs the counts of each kind when the run completed', async () => {
    mockedPrune.mockResolvedValue({ pruned: { dashboard: 1 }, errors: [] });

    await runTask({
      status: 'completed',
      errors: [],
      kinds: {
        data_view: { applied: 2, created: 1, unchanged: 3, failed: 0 },
        dashboard: { applied: 1, failed: 0 },
      },
    });

    expect(logger.info).toHaveBeenCalledWith(
      `Applied the bootstrap files mounted at /files (${hash}): data_view: 2 applied, 1 created, 3 unchanged, 0 failed; dashboard: 1 applied, 0 failed, 1 pruned`
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('logs the counts and the errors with their kind, space and id when the run failed', async () => {
    await runTask({
      status: 'failed',
      errors: [
        { kind: 'data_view', spaceId: 'default', id: 'a', message: 'already exists' },
        { kind: 'k', message: 'No resource kind "k" is registered' },
      ],
      kinds: { data_view: { applied: 0, failed: 1 } },
    }).catch(() => undefined);

    expect(logger.warn).toHaveBeenCalledWith(
      [
        `Applying the bootstrap files mounted at /files (${hash}) failed with 2 errors: data_view: 0 applied, 1 failed`,
        '- data_view "a" in space "default": already exists',
        '- k: No resource kind "k" is registered',
      ].join('\n')
    );
  });

  it('logs only the first errors, with how many it left out', async () => {
    const errors = Array.from({ length: 150 }, (_, index) => ({
      kind: 'k',
      spaceId: 's',
      message: `m${index}`,
    }));

    await runTask({ status: 'failed', errors }).catch(() => undefined);

    const [[message]] = logger.warn.mock.calls;
    const lines = String(message).split('\n');
    expect(lines[0]).toContain('failed with 150 errors: no resources applied');
    expect(lines).toHaveLength(MAX_LOGGED_ERRORS + 2);
    expect(lines[lines.length - 1]).toBe(
      `- and ${
        150 - MAX_LOGGED_ERRORS
      } more; /internal/resource_bootstrap/status lists the first ${MAX_REPORTED_ERRORS}`
    );
  });

  it('reads what is owned once, before applying, for applying and pruning', async () => {
    await runTask({ status: 'completed', errors: [] });

    const owned = new Map([[ownedItem.docId, ownedItem.entry]]);
    expect(ledger.list).toHaveBeenCalledTimes(1);
    expect(mockedApply).toHaveBeenCalledWith(
      expect.objectContaining({ owned, ledger, kibanaVersion: '9.4.0' })
    );
    expect(mockedPrune).toHaveBeenCalledWith(expect.objectContaining({ owned, ledger }));
  });

  it('applies nothing and retries when what is owned cannot be read', async () => {
    ledger.list.mockRejectedValueOnce(new Error('ledger down'));

    const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

    expect(error).toEqual(new Error('ledger down'));
    expect(isUnrecoverableError(error)).toBe(false);
    expect(mockedApply).not.toHaveBeenCalled();
    expect(status.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });

  it('retries when the ledger cannot be written', async () => {
    mockedPrune.mockRejectedValue(new Error('es down'));

    const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

    expect(error).toEqual(new Error('es down'));
    expect(isUnrecoverableError(error)).toBe(false);
    expect(status.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errors: [expect.objectContaining({ message: 'es down' })],
      })
    );
  });

  it('rethrows an abort during ownership recording', async () => {
    const controller = new AbortController();
    controller.abort();
    mockedPrune.mockRejectedValue(new Error('aborted'));

    const error = await runTask({ status: 'completed', errors: [] }, controller.signal).catch(
      (e) => e
    );

    expect(error).toEqual(new Error('aborted'));
    expect(isUnrecoverableError(error)).toBe(false);
  });

  it('does not retry files that cannot be read, since restarting Kibana is the way to recover', async () => {
    seenFilesHash = null;
    mockedRead.mockRejectedValue(new BootstrapReadError(['/files: EIO']));

    const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

    expect(error).toBeInstanceOf(BootstrapReadError);
    expect(isUnrecoverableError(error)).toBe(true);
    expect(status.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(mockedApply).not.toHaveBeenCalled();
  });

  it('keeps the unrecoverable read error when recording the failure fails', async () => {
    seenFilesHash = null;
    mockedRead.mockRejectedValue(new BootstrapReadError(['/files: EIO']));
    status.set.mockRejectedValueOnce(new Error('status down'));

    const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

    expect(error).toBeInstanceOf(BootstrapReadError);
    expect(isUnrecoverableError(error)).toBe(true);
  });

  it('records every problem of unreadable files', async () => {
    seenFilesHash = null;
    mockedRead.mockRejectedValue(new BootstrapReadError(['/a: EIO', '/b: EACCES']));

    await runTask({ status: 'completed', errors: [] }).catch(() => undefined);

    expect(status.set).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [{ message: '/a: EIO' }, { message: '/b: EACCES' }],
      })
    );
  });

  it('shortens a long message of a run that failed before applying', async () => {
    mockedRead.mockRejectedValue(new Error('x'.repeat(MAX_REPORTED_MESSAGE_LENGTH + 1)));

    await runTask({ status: 'completed', errors: [] }).catch(() => undefined);

    expect(status.set).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [{ message: `${'x'.repeat(MAX_REPORTED_MESSAGE_LENGTH)}…` }],
      })
    );
  });

  it('prunes as configured, since only its own files decide what is left', async () => {
    prune = true;

    await runTask({ status: 'completed', errors: [] });

    expect(mockedPrune).toHaveBeenCalledWith(expect.objectContaining({ prune: true }));
  });

  it('records the run as running, then its outcome, for the hash it read', async () => {
    await runTask({ status: 'completed', errors: [] });

    expect(status.set.mock.calls.map(([attributes]) => attributes)).toEqual([
      { hash, status: 'running', startedAt: expect.any(String), kinds: {}, errors: [] },
      {
        hash,
        status: 'completed',
        startedAt: expect.any(String),
        finishedAt: expect.any(String),
        kinds: {},
        errors: [],
        finishedRequestNumber: requestNumber,
        coveredRequestNumber: requestNumber,
        settingsHash: hashSettings({ managed: true, prune: false, kibanaVersion }),
      },
    ]);
  });

  it('records the highest request number taken when it read the files, not its own', async () => {
    latestRequestNumber = requestNumber + 2;

    await runTask({ status: 'completed', errors: [] });

    expect(status.set).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'completed', coveredRequestNumber: requestNumber + 2 })
    );
  });

  describe('when the files were already applied', () => {
    const completed = (
      coveredRequestNumber: number | undefined,
      overrides: Partial<BootstrapStatusAttributes> = {}
    ): BootstrapStatusAttributes => ({
      hash,
      status: 'completed',
      kinds: {},
      errors: [],
      ...(coveredRequestNumber !== undefined && { coveredRequestNumber }),
      settingsHash: hashSettings({ managed: true, prune, kibanaVersion }),
      ...overrides,
    });

    it.each([
      ['this request', requestNumber],
      ['a later request', requestNumber + 1],
    ])('skips files that a run covering %s applied', async (_name, covered) => {
      status.get.mockResolvedValueOnce(completed(covered));

      await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
        state: { deferrals: 0 },
        shouldDeleteTask: true,
      });

      expect(mockedApply).not.toHaveBeenCalled();
      expect(status.set).not.toHaveBeenCalled();
    });

    it.each([
      ['an earlier request', requestNumber - 1],
      ['no request number', undefined],
    ])('applies them again when the run that applied them covered %s', async (_name, covered) => {
      status.get.mockResolvedValueOnce(completed(covered));

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).toHaveBeenCalled();
    });

    it('skips them whenever they were applied, with reapplyOnStart off', async () => {
      reapplyOnStart = false;
      status.get.mockResolvedValueOnce(completed(requestNumber - 1));

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).not.toHaveBeenCalled();
    });

    it('does not apply or record anything when the request counter cannot be read', async () => {
      requests.latest.mockRejectedValueOnce(new Error('es down'));

      const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

      expect(error).toEqual(new Error('es down'));
      expect(isUnrecoverableError(error)).toBe(false);
      expect(mockedRead).not.toHaveBeenCalled();
      expect(status.set).not.toHaveBeenCalled();
    });

    it.each([
      ['other files completed', { hash: 'other' }],
      ['the last run of these files failed', { status: 'failed' as const }],
      ['the last run of these files never finished', { status: 'running' as const }],
      [
        'they were applied with another managed setting',
        { settingsHash: hashSettings({ managed: false, prune: false, kibanaVersion }) },
      ],
      [
        'they were applied with another prune setting',
        { settingsHash: hashSettings({ managed: true, prune: true, kibanaVersion }) },
      ],
      [
        'they were applied by another Kibana version',
        { settingsHash: hashSettings({ managed: true, prune: false, kibanaVersion: '9.3.0' }) },
      ],
      ['the record predates settings hashes', { settingsHash: undefined }],
    ])('applies them when %s, even with reapplyOnStart off', async (_name, overrides) => {
      reapplyOnStart = false;
      status.get.mockResolvedValueOnce(completed(requestNumber, overrides));

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).toHaveBeenCalled();
    });
  });

  it('records the hash of files with invalid content that it could read', async () => {
    seenFilesHash = 'h2';
    mockedRead.mockRejectedValue(new BootstrapReadError(['bad.data_view.json: invalid'], 'h2'));

    await runTask({ status: 'completed', errors: [] }).catch(() => undefined);

    expect(status.set).toHaveBeenCalledWith(
      expect.objectContaining({ hash: 'h2', status: 'failed' })
    );
  });

  it('records no hash for files it could not read', async () => {
    seenFilesHash = null;
    mockedRead.mockRejectedValue(new BootstrapReadError(['/files: EIO']));

    await runTask({ status: 'completed', errors: [] }).catch(() => undefined);

    expect(status.set).toHaveBeenCalledWith(
      expect.objectContaining({ hash: null, status: 'failed' })
    );
  });

  it('records the failure and rethrows when reading the files fails unexpectedly', async () => {
    mockedRead.mockRejectedValue(new Error('boom'));

    const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

    expect(error).toEqual(new Error('boom'));
    expect(isUnrecoverableError(error)).toBe(false);
    expect(status.set).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errors: [expect.objectContaining({ message: 'boom' })],
      })
    );
    expect(mockedApply).not.toHaveBeenCalled();
  });

  it('reads, applies, prunes and records under one lock shared by every hash', async () => {
    const seenInsideLock: boolean[] = [];
    mockedRead.mockImplementationOnce(async () => {
      seenInsideLock.push(insideLock);
      return { hash, groups: [] };
    });
    mockedPrune.mockImplementationOnce(async () => {
      seenInsideLock.push(insideLock);
      return { pruned: {}, errors: [] };
    });
    const recordInsideLock = async () => {
      seenInsideLock.push(insideLock);
    };
    status.set.mockImplementationOnce(recordInsideLock).mockImplementationOnce(recordInsideLock);

    await runTask({ status: 'completed', errors: [] });

    expect(lockManager.withLock).toHaveBeenCalledWith(APPLY_LOCK_ID, expect.any(Function), {
      metadata: { requestNumber },
    });
    expect(seenInsideLock).toEqual([true, true, true, true]);
  });

  // Task Manager treats the `runAt` as a successful run, which resets its attempts.
  it('waits as a successful run, rescheduled, while another run holds the lock', async () => {
    lockManager.withLock.mockRejectedValueOnce(new LockAcquisitionError('not acquired'));
    const before = Date.now();

    const result = await runTask({ status: 'completed', errors: [] });

    expect(result).toEqual({ state: { deferrals: 0 }, runAt: expect.any(Date) });
    const { runAt } = result as { runAt: Date };
    expect(runAt.getTime()).toBeGreaterThanOrEqual(before + BUSY_RETRY_DELAY_MS);
    expect(mockedRead).not.toHaveBeenCalled();
    expect(status.set).not.toHaveBeenCalled();
  });

  it('keeps counting how often the run was left to another instance while it waits', async () => {
    deferrals = 3;
    lockManager.withLock.mockRejectedValueOnce(new LockAcquisitionError('not acquired'));

    await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
      state: { deferrals: 3 },
      runAt: expect.any(Date),
    });
  });

  describe('with what the instance that asked for the run saw', () => {
    const settingsHash = () => hashSettings({ managed: true, prune, kibanaVersion });

    it('applies when this instance sees the same', async () => {
      expected = { filesHash: hash, settingsHash: settingsHash() };

      await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
        state: { deferrals: 0 },
        shouldDeleteTask: true,
      });
      expect(mockedApply).toHaveBeenCalled();
    });

    it.each([
      ['other files', () => ({ filesHash: 'other', settingsHash: settingsHash() })],
      [
        'another Kibana version',
        () => ({
          filesHash: hash,
          settingsHash: hashSettings({ managed: true, prune, kibanaVersion: '9.5.0' }),
        }),
      ],
      [
        'other settings',
        () => ({
          filesHash: hash,
          settingsHash: hashSettings({ managed: false, prune, kibanaVersion }),
        }),
      ],
    ])(
      'leaves the request to another instance, without an attempt, when it sees %s',
      async (_name, toExpected) => {
        expected = toExpected();
        deferrals = 2;
        const before = Date.now();

        const result = await runTask({ status: 'completed', errors: [] });

        expect(result).toEqual({ state: { deferrals: 3 }, runAt: expect.any(Date) });
        const { runAt } = result as { runAt: Date };
        expect(runAt.getTime()).toBeGreaterThanOrEqual(before + BUSY_RETRY_DELAY_MS);
        expect(mockedApply).not.toHaveBeenCalled();
        expect(status.set).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining(
            `Leaving request ${requestNumber} to apply the bootstrap files to another instance (3 of ${MAX_DEFERRALS})`
          )
        );
      }
    );

    it('fails the request once it was left to other instances too often', async () => {
      expected = { filesHash: 'other', settingsHash: settingsHash() };
      deferrals = MAX_DEFERRALS;

      const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

      expect(isUnrecoverableError(error)).toBe(true);
      expect(mockedApply).not.toHaveBeenCalled();
      expect(status.set).toHaveBeenCalledWith(
        expect.objectContaining({
          hash,
          status: 'failed',
          errors: [
            {
              message: expect.stringContaining(
                `This instance sees other files (${hash}) than the instance that asked for this run (other), so it was not applied`
              ),
            },
          ],
        })
      );
    });

    describe('once it was left to other instances too often', () => {
      const completedFor = (
        overrides: Partial<BootstrapStatusAttributes>
      ): BootstrapStatusAttributes => ({
        hash,
        status: 'completed',
        kinds: {},
        errors: [],
        settingsHash: settingsHash(),
        coveredRequestNumber: requestNumber + 1,
        finishedRequestNumber: requestNumber - 1,
        ...overrides,
      });

      beforeEach(() => {
        expected = { filesHash: 'other', settingsHash: settingsHash() };
        deferrals = MAX_DEFERRALS;
      });

      it('keeps the status of a later run that applied what this instance sees', async () => {
        status.get.mockResolvedValueOnce(completedFor({}));

        await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
          state: { deferrals: MAX_DEFERRALS },
          shouldDeleteTask: true,
        });
        expect(mockedApply).not.toHaveBeenCalled();
        expect(status.set).not.toHaveBeenCalled();
      });

      it.each([
        ['read the files before this request was numbered', { coveredRequestNumber: 4 }],
        ['applied other files', { hash: 'older' }],
        ['applied with other settings', { settingsHash: 'older' }],
        ['failed', { status: 'failed' as const }],
      ])('fails the request when the last run %s', async (_name, overrides) => {
        status.get.mockResolvedValueOnce(completedFor(overrides));

        const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

        expect(isUnrecoverableError(error)).toBe(true);
        expect(status.set).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
      });
    });

    it('records the problems of files that neither instance could read', async () => {
      expected = { filesHash: null, settingsHash: settingsHash() };
      mockedRead.mockRejectedValue(new BootstrapReadError(['/files: EIO']));

      const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

      expect(isUnrecoverableError(error)).toBe(true);
      expect(status.set).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: null,
          status: 'failed',
          errors: [{ message: '/files: EIO' }],
        })
      );
    });
  });

  describe('when a later request finished', () => {
    const finishedBy = (
      by: number,
      overrides: Partial<BootstrapStatusAttributes> = {}
    ): BootstrapStatusAttributes => ({
      hash: 'newer',
      status: 'completed',
      kinds: {},
      errors: [],
      finishedRequestNumber: by,
      ...overrides,
    });

    it.each([
      ['completed', finishedBy(requestNumber + 1)],
      [
        'failed',
        finishedBy(requestNumber + 1, {
          status: 'failed',
          errors: [{ kind: 'dashboard', id: 'd', message: 'invalid panel' }],
        }),
      ],
    ])(
      'skips this request without reading the files, whatever this instance sees, when it %s',
      async (_name, last) => {
        expected = { filesHash: 'older', settingsHash: 'older' };
        status.get.mockResolvedValueOnce(last);

        await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
          state: { deferrals: 0 },
          shouldDeleteTask: true,
        });
        expect(mockedRead).not.toHaveBeenCalled();
        expect(mockedApply).not.toHaveBeenCalled();
        expect(status.set).not.toHaveBeenCalled();
      }
    );

    it('keeps the errors of a later failed run when this request was left to other instances too often', async () => {
      expected = { filesHash: 'older', settingsHash: 'older' };
      deferrals = MAX_DEFERRALS;
      status.get.mockResolvedValueOnce(
        finishedBy(requestNumber + 1, {
          status: 'failed',
          errors: [{ kind: 'dashboard', id: 'd', message: 'invalid panel' }],
        })
      );

      await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
        state: { deferrals: MAX_DEFERRALS },
        shouldDeleteTask: true,
      });
      expect(status.set).not.toHaveBeenCalled();
    });

    it('lets an older request apply when the later one was never seen by any instance', async () => {
      requestNumber = 6;
      expected = {
        filesHash: 'gone',
        settingsHash: hashSettings({ managed: true, prune, kibanaVersion }),
      };
      deferrals = MAX_DEFERRALS;
      status.get.mockResolvedValueOnce(finishedBy(4));
      await runTask({ status: 'completed', errors: [] }).catch(() => {});
      const gaveUp = status.set.mock.calls.at(-1)?.[0];
      expect(gaveUp?.status).toBe('failed');
      expect(gaveUp?.finishedRequestNumber).toBe(4);

      requestNumber = 5;
      expected = undefined;
      deferrals = 0;
      status.get.mockResolvedValueOnce(gaveUp);
      mockedApply.mockClear();

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).toHaveBeenCalled();
      expect(status.set).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'completed', finishedRequestNumber: 5 })
      );
    });

    it.each([
      ['apply', 7],
      ['invalid files', 7],
      // Not finished: Task Manager runs request 7 again.
      ['unexpected read error', 5],
    ])(
      'keeps an older request superseded after a later %s failure',
      async (failure, finishedAfterFailure) => {
        await runTask({ status: 'completed', errors: [] });
        const successful = status.set.mock.calls.at(-1)?.[0];
        expect(successful?.finishedRequestNumber).toBe(5);

        requestNumber = 7;
        status.get.mockResolvedValueOnce(successful);
        status.set.mockClear();
        if (failure === 'invalid files') {
          seenFilesHash = null;
          mockedRead.mockRejectedValueOnce(new BootstrapReadError(['invalid JSON']));
        } else if (failure === 'unexpected read error') {
          mockedRead.mockRejectedValueOnce(new Error('read failed'));
        }
        await expect(
          runTask({ status: 'failed', errors: [{ message: 'apply failed' }] })
        ).rejects.toBeDefined();

        const records = status.set.mock.calls.map(([record]) => record);
        for (const record of records.slice(0, -1)) {
          expect(record.finishedRequestNumber).toBe(5);
        }
        expect(records.at(-1)?.finishedRequestNumber).toBe(finishedAfterFailure);
        const failed = status.set.mock.calls.at(-1)?.[0];
        expect(failed?.status).toBe('failed');

        requestNumber = 4;
        expected = { filesHash: 'older', settingsHash: 'older' };
        status.get.mockResolvedValueOnce(failed);
        mockedRead.mockClear();
        mockedApply.mockClear();
        mockedPrune.mockClear();
        status.set.mockClear();

        await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
          state: { deferrals: 0 },
          shouldDeleteTask: true,
        });
        expect(mockedRead).not.toHaveBeenCalled();
        expect(mockedApply).not.toHaveBeenCalled();
        expect(mockedPrune).not.toHaveBeenCalled();
        expect(status.set).not.toHaveBeenCalled();
      }
    );

    it.each([
      ['this request completed', finishedBy(requestNumber)],
      // A retry of this request after a failure Task Manager retries.
      ['this request failed', finishedBy(requestNumber, { status: 'failed' })],
      ['an earlier request completed', finishedBy(requestNumber - 1)],
      ['an earlier request failed', finishedBy(requestNumber - 1, { status: 'failed' })],
    ])('applies other files when %s', async (_name, last) => {
      status.get.mockResolvedValueOnce(last);

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).toHaveBeenCalled();
    });
  });

  describe('with a REVISION of the files', () => {
    const lastRun = (
      overrides: Partial<BootstrapStatusAttributes> = {}
    ): BootstrapStatusAttributes => ({
      hash: 'newer',
      status: 'completed',
      kinds: {},
      errors: [],
      revision: 7,
      ...overrides,
    });
    const readRevision = (revision?: number) =>
      mockedRead.mockResolvedValue({
        hash,
        groups: [],
        ...(revision !== undefined && { revision }),
      });

    it('skips files with a lower revision than a run already applied, and records nothing', async () => {
      readRevision(6);
      status.get.mockResolvedValueOnce(lastRun());

      await expect(runTask({ status: 'completed', errors: [] })).resolves.toEqual({
        state: { deferrals: 0 },
        shouldDeleteTask: true,
      });
      expect(mockedApply).not.toHaveBeenCalled();
      expect(mockedPrune).not.toHaveBeenCalled();
      expect(status.set).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('revision 6, older than'));
    });

    it('skips them even when the run that applied the higher revision failed', async () => {
      readRevision(6);
      status.get.mockResolvedValueOnce(lastRun({ status: 'failed' }));

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).not.toHaveBeenCalled();
      expect(status.set).not.toHaveBeenCalled();
    });

    it.each([
      ['the same revision', 7, 7],
      ['a higher revision', 8, 8],
    ])('applies files with %s and records it', async (_name, revision, recorded) => {
      readRevision(revision);
      status.get.mockResolvedValueOnce(lastRun());

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).toHaveBeenCalled();
      const records = status.set.mock.calls.map(([record]) => record);
      expect(records.map((record) => record.revision)).toEqual([recorded, recorded]);
    });

    it('applies files without a revision, and keeps the revision a run recorded', async () => {
      readRevision();
      status.get.mockResolvedValueOnce(lastRun());

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).toHaveBeenCalled();
      const records = status.set.mock.calls.map(([record]) => record);
      expect(records.map((record) => record.revision)).toEqual([7, 7]);
    });

    it('applies files with a revision when no run recorded one', async () => {
      readRevision(3);
      status.get.mockResolvedValueOnce(lastRun({ revision: undefined }));

      await runTask({ status: 'completed', errors: [] });

      expect(mockedApply).toHaveBeenCalled();
      expect(status.set).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'completed', revision: 3 })
      );
    });

    it('records no revision while no files had one', async () => {
      await runTask({ status: 'completed', errors: [] });

      for (const [record] of status.set.mock.calls) {
        expect(record).not.toHaveProperty('revision');
      }
    });

    it('keeps the revision when the apply fails, so older files stay refused', async () => {
      readRevision(8);
      status.get.mockResolvedValueOnce(lastRun());

      await expect(
        runTask({ status: 'failed', errors: [{ message: 'apply failed' }] })
      ).rejects.toBeDefined();

      expect(status.set).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'failed', revision: 8 })
      );
    });

    it('keeps the revision when the files cannot be read', async () => {
      seenFilesHash = null;
      mockedRead.mockRejectedValueOnce(new BootstrapReadError(['invalid JSON']));
      status.get.mockResolvedValueOnce(lastRun());

      await expect(runTask({ status: 'completed', errors: [] })).rejects.toBeDefined();

      expect(status.set).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'failed', revision: 7 })
      );
    });
  });

  it('does not mistake another lock failure for a run in progress', async () => {
    lockManager.withLock.mockRejectedValueOnce(new Error('elasticsearch is down'));

    await expect(runTask({ status: 'completed', errors: [] })).rejects.toThrow(
      'elasticsearch is down'
    );
  });

  it('keeps an unrecoverable failure unrecoverable through the lock', async () => {
    seenFilesHash = null;
    mockedRead.mockRejectedValue(new BootstrapReadError(['/files: EIO']));

    const error = await runTask({ status: 'completed', errors: [] }).catch((e) => e);

    expect(isUnrecoverableError(error)).toBe(true);
  });
});
