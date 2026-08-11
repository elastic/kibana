/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { loggerMock } from '@kbn/logging-mocks';

import { runReconciliation } from './runner';
import { runActivityReconciliation } from './activity_runner';
import { runAttachmentsReconciliation } from './attachments_runner';
import { resetReconciliationTask } from '.';
import { runFullReset } from './reset_runner';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import type { CasesActivityV2WriterContract } from '../writer/activity';
import type { CasesAttachmentsV2WriterContract } from '../writer/attachments';

jest.mock('./runner', () => ({ runReconciliation: jest.fn() }));
jest.mock('./activity_runner', () => ({ runActivityReconciliation: jest.fn() }));
jest.mock('./attachments_runner', () => ({ runAttachmentsReconciliation: jest.fn() }));
jest.mock('.', () => ({ resetReconciliationTask: jest.fn() }));

const runReconciliationMock = runReconciliation as jest.Mock;
const runActivityReconciliationMock = runActivityReconciliation as jest.Mock;
const runAttachmentsReconciliationMock = runAttachmentsReconciliation as jest.Mock;
const resetReconciliationTaskMock = resetReconciliationTask as jest.Mock;

const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

const buildDeps = (overrides: Partial<Parameters<typeof runFullReset>[0]> = {}) => ({
  savedObjectsClient: savedObjectsClientMock.create() as SavedObjectsClientContract,
  writer: {} as unknown as CasesAnalyticsV2WriterContract,
  activityWriter: {} as unknown as CasesActivityV2WriterContract,
  attachmentsWriter: {} as unknown as CasesAttachmentsV2WriterContract,
  taskManager: {} as unknown as TaskManagerStartContract,
  intervalMinutes: 30,
  pageDelayMs: 0,
  logger: loggerMock.create(),
  ...overrides,
});

describe('runFullReset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runReconciliationMock.mockResolvedValue({
      newLastRunAt: '2026-05-01T00:00:00.000Z',
      processed: 5,
    });
    runActivityReconciliationMock.mockResolvedValue({
      newLastRunAt: '2026-05-01T00:00:01.000Z',
      processed: 9,
    });
    runAttachmentsReconciliationMock.mockResolvedValue({
      newLastRunAt: '2026-05-01T00:00:02.000Z',
      processed: 7,
    });
    resetReconciliationTaskMock.mockResolvedValue(undefined);
  });

  it('walks all three surfaces as a full backfill (lastRunAt undefined) and aggregates results', async () => {
    const result = await runFullReset(buildDeps());

    expect(runReconciliationMock).toHaveBeenCalledTimes(1);
    expect(runActivityReconciliationMock).toHaveBeenCalledTimes(1);
    expect(runAttachmentsReconciliationMock).toHaveBeenCalledTimes(1);

    // Every surface runs as a full walk — the persisted cursor is ignored.
    expect(runReconciliationMock.mock.calls[0][0]).toMatchObject({ lastRunAt: undefined });
    expect(runActivityReconciliationMock.mock.calls[0][0]).toMatchObject({ lastRunAt: undefined });
    expect(runAttachmentsReconciliationMock.mock.calls[0][0]).toMatchObject({
      lastRunAt: undefined,
    });

    expect(result.casesCursor).toBe('2026-05-01T00:00:00.000Z');
    expect(result.activityCursor).toBe('2026-05-01T00:00:01.000Z');
    expect(result.attachmentsCursor).toBe('2026-05-01T00:00:02.000Z');
    expect(result.casesError).toBeNull();
    expect(result.activityError).toBeNull();
    expect(result.attachmentsError).toBeNull();
  });

  it('dispatches the three surface walks concurrently', async () => {
    // Make the cases walk hang so we can observe that activity + attachments
    // were already dispatched while cases is still in flight — proving the
    // walks run in parallel rather than cases → activity → attachments.
    let resolveCases: (v: { newLastRunAt: string; processed: number }) => void = () => {};
    runReconciliationMock.mockReturnValue(
      new Promise((resolve) => {
        resolveCases = resolve;
      })
    );

    const promise = runFullReset(buildDeps());
    await flushMicrotasks();

    expect(runActivityReconciliationMock).toHaveBeenCalledTimes(1);
    expect(runAttachmentsReconciliationMock).toHaveBeenCalledTimes(1);

    resolveCases({ newLastRunAt: '2026-05-01T00:00:00.000Z', processed: 5 });
    await promise;
  });

  it('seeds only the successful surfaces cursors and isolates a per-surface failure', async () => {
    const attachmentsErr = new Error('attachments walk blew up');
    runAttachmentsReconciliationMock.mockRejectedValue(attachmentsErr);
    const logger = loggerMock.create();

    const result = await runFullReset(buildDeps({ logger }));

    // Cases + activity still complete despite the attachments failure.
    expect(result.cases).not.toBeNull();
    expect(result.activity).not.toBeNull();
    expect(result.attachments).toBeNull();
    expect(result.attachmentsError).toBe(attachmentsErr);
    expect(result.attachmentsCursor).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('full attachments re-walk failed')
    );

    // The seeded cursor state omits the failed surface so the next periodic
    // tick re-walks attachments from scratch.
    expect(resetReconciliationTaskMock).toHaveBeenCalledTimes(1);
    const { initialState } = resetReconciliationTaskMock.mock.calls[0][0];
    expect(initialState).toEqual({
      cases_last_run_at: '2026-05-01T00:00:00.000Z',
      activity_last_run_at: '2026-05-01T00:00:01.000Z',
    });
    expect(initialState).not.toHaveProperty('attachments_last_run_at');
  });

  it('invokes the attachments runner without a source-type gate (ungated dual-source)', async () => {
    // Since PR #275225 both attachment SO types are always registered, so the
    // reset never gates the attachments walk to a single source — the runner
    // always walks both. Guard against a `sourceTypes` gate being reintroduced.
    await runFullReset(buildDeps());

    expect(runAttachmentsReconciliationMock).toHaveBeenCalledTimes(1);
    expect(runAttachmentsReconciliationMock.mock.calls[0][0]).not.toHaveProperty('sourceTypes');
  });

  it('skips cursor seeding when task manager is unavailable', async () => {
    await runFullReset(buildDeps({ taskManager: null }));

    expect(resetReconciliationTaskMock).not.toHaveBeenCalled();
  });
});
