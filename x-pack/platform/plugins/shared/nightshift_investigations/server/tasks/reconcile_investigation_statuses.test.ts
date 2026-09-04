/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import type { InvestigationStatus } from '../../common';
import { InvestigationStaleWriteError } from '../storage';
import type { FindInvestigationsAcrossSpacesResult } from '../storage';
import {
  reconcileInvestigationStatuses,
  type ExecutionSummary,
  type ReconcileInvestigationStatusesDeps,
} from './reconcile_investigation_statuses';

const HOUR_MS = 60 * 60 * 1000;

type SweepFields = 'created_at';
type SweepResult = FindInvestigationsAcrossSpacesResult<SweepFields>;
type SweepInvestigation = SweepResult['results'][number];

const investigation = ({
  id,
  spaceId = 'default',
  version = 'WzEsMV0=',
  createdAt = new Date().toISOString(),
}: {
  id: string;
  spaceId?: string;
  version?: string;
  createdAt?: string;
}): SweepInvestigation => ({
  investigation: {
    id,
    version,
    created_at: createdAt,
  },
  spaceId,
});

const page = (results: SweepInvestigation[]): SweepResult => ({
  results,
  total: results.length,
  page: 1,
  size: 100,
});

const FINISHED_AT = '2024-06-01T12:00:00.000Z';

const execution = (status: ExecutionStatus, message?: string): ExecutionSummary => ({
  status,
  error: message ? { message } : undefined,
  finishedAt: FINISHED_AT,
});

const createMockInvestigations = () => ({
  findAcrossSpaces: jest.fn().mockResolvedValue(page([])),
  updateInSpace: jest.fn().mockResolvedValue(undefined),
});

const setup = () => {
  const investigationSweepRepository = createMockInvestigations();
  const getExecutionSummaries: jest.MockedFunction<
    ReconcileInvestigationStatusesDeps['getExecutionSummaries']
  > = jest.fn().mockResolvedValue(new Map());
  const abortController = new AbortController();

  /** Resolves every id in the batch to the same execution. */
  const resolveAllExecutionsTo = (summary: ExecutionSummary) => {
    getExecutionSummaries.mockImplementation(
      async (executionIds) => new Map(executionIds.map((id) => [id, summary]))
    );
  };

  return {
    investigationSweepRepository,
    getExecutionSummaries,
    resolveAllExecutionsTo,
    abortController,
    run: () =>
      reconcileInvestigationStatuses({
        investigationSweepRepository,
        getExecutionSummaries,
        logger: loggerMock.create(),
        signal: abortController.signal,
      }),
  };
};

describe('reconcileInvestigationStatuses', () => {
  it('asks for investigations in a non-terminal status', async () => {
    const { investigationSweepRepository, run } = setup();

    await run();

    expect(investigationSweepRepository.findAcrossSpaces.mock.calls[0][0].statuses).toEqual([
      'pending',
      'running',
    ]);
  });

  it('patches the investigation in the space it was found in', async () => {
    const { investigationSweepRepository, getExecutionSummaries, resolveAllExecutionsTo, run } =
      setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1', spaceId: 'team-a', version: 'v1' })])
    );
    resolveAllExecutionsTo(execution(ExecutionStatus.CANCELLED));

    const result = await run();

    expect(getExecutionSummaries).toHaveBeenCalledWith(['inv-1'], 'team-a');
    expect(investigationSweepRepository.updateInSpace).toHaveBeenCalledTimes(1);
    const update = investigationSweepRepository.updateInSpace.mock.calls[0][0];
    expect(update.id).toBe('inv-1');
    expect(update.spaceId).toBe('team-a');
    expect(update.version).toBe('v1');
    expect(update.patch.status).toBe('cancelled');
    expect(update.patch.completed_at).toBe(FINISHED_AT);
    expect(result).toEqual({ scanned: 1, reconciled: 1 });
  });

  it('looks executions up once per space rather than once per investigation', async () => {
    const { investigationSweepRepository, getExecutionSummaries, resolveAllExecutionsTo, run } =
      setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([
        investigation({ id: 'inv-1', spaceId: 'team-a' }),
        investigation({ id: 'inv-2', spaceId: 'team-b' }),
        investigation({ id: 'inv-3', spaceId: 'team-a' }),
      ])
    );
    resolveAllExecutionsTo(execution(ExecutionStatus.RUNNING));

    await run();

    expect(getExecutionSummaries).toHaveBeenCalledTimes(2);
    expect(getExecutionSummaries).toHaveBeenCalledWith(['inv-1', 'inv-3'], 'team-a');
    expect(getExecutionSummaries).toHaveBeenCalledWith(['inv-2'], 'team-b');
  });

  const terminalMappings: Array<[ExecutionStatus, InvestigationStatus]> = [
    [ExecutionStatus.COMPLETED, 'completed'],
    [ExecutionStatus.FAILED, 'failed'],
    [ExecutionStatus.TIMED_OUT, 'failed'],
    [ExecutionStatus.CANCELLED, 'cancelled'],
    [ExecutionStatus.SKIPPED, 'cancelled'],
  ];

  it.each(terminalMappings)(
    'maps terminal execution status "%s" to investigation status "%s"',
    async (from, to) => {
      const { investigationSweepRepository, resolveAllExecutionsTo, run } = setup();
      investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
        page([investigation({ id: 'inv-1' })])
      );
      resolveAllExecutionsTo(execution(from));

      await run();

      expect(investigationSweepRepository.updateInSpace.mock.calls[0][0].patch.status).toBe(to);
    }
  );

  it('records the execution error on a failed investigation, falling back to a generic message', async () => {
    const { investigationSweepRepository, getExecutionSummaries, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1' }), investigation({ id: 'inv-2' })])
    );
    getExecutionSummaries.mockResolvedValue(
      new Map([
        ['inv-1', execution(ExecutionStatus.FAILED, 'step "analyse" threw')],
        ['inv-2', execution(ExecutionStatus.TIMED_OUT)],
      ])
    );

    await run();

    const patches = investigationSweepRepository.updateInSpace.mock.calls.map(([params]) => params);
    expect(patches[0].id).toBe('inv-1');
    expect(patches[0].patch.error).toBe('step "analyse" threw');
    expect(patches[1].id).toBe('inv-2');
    expect(patches[1].patch.error).toBe('Workflow execution timed out');
  });

  it.each([
    ExecutionStatus.PENDING,
    ExecutionStatus.QUEUED,
    ExecutionStatus.RUNNING,
    ExecutionStatus.WAITING,
    ExecutionStatus.WAITING_FOR_INPUT,
    ExecutionStatus.WAITING_FOR_CHILD,
  ])('leaves the investigation alone while the execution is "%s"', async (status) => {
    const { investigationSweepRepository, resolveAllExecutionsTo, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1' })])
    );
    resolveAllExecutionsTo(execution(status));

    const result = await run();

    expect(investigationSweepRepository.updateInSpace).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, reconciled: 0 });
  });

  it('waits out the grace period when a recent investigation has no execution', async () => {
    const { investigationSweepRepository, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1' })])
    );

    await run();

    expect(investigationSweepRepository.updateInSpace).not.toHaveBeenCalled();
  });

  it('fails an investigation whose execution has been missing past the grace period', async () => {
    const { investigationSweepRepository, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([
        investigation({ id: 'inv-1', createdAt: new Date(Date.now() - 2 * HOUR_MS).toISOString() }),
      ])
    );

    const result = await run();

    expect(investigationSweepRepository.updateInSpace.mock.calls[0][0].patch).toEqual({
      status: 'failed',
      error: 'Workflow execution no longer exists',
      completed_at: expect.any(String),
    });
    expect(result).toEqual({ scanned: 1, reconciled: 1 });
  });

  it('never guesses an outcome from an unparseable created_at', async () => {
    const { investigationSweepRepository, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1', createdAt: 'not-a-date' })])
    );

    await run();

    expect(investigationSweepRepository.updateInSpace).not.toHaveBeenCalled();
  });

  it('never reads a failed execution lookup as a missing execution', async () => {
    const { investigationSweepRepository, getExecutionSummaries, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([
        investigation({ id: 'inv-1', createdAt: new Date(Date.now() - 2 * HOUR_MS).toISOString() }),
      ])
    );
    getExecutionSummaries.mockRejectedValue(new Error('workflows unavailable'));

    const result = await run();

    expect(investigationSweepRepository.updateInSpace).not.toHaveBeenCalled();
    expect(result).toEqual({ scanned: 1, reconciled: 0 });
  });

  it('reads every page of candidates before patching any of them', async () => {
    const { investigationSweepRepository, resolveAllExecutionsTo, run } = setup();
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      investigation({ id: `inv-${index}` })
    );
    investigationSweepRepository.findAcrossSpaces
      .mockResolvedValueOnce(page(firstPage))
      .mockResolvedValueOnce(page([investigation({ id: 'inv-100' })]));
    resolveAllExecutionsTo(execution(ExecutionStatus.COMPLETED));

    const result = await run();

    expect(investigationSweepRepository.findAcrossSpaces).toHaveBeenCalledTimes(2);
    expect(investigationSweepRepository.findAcrossSpaces.mock.calls[1][0].page).toBe(2);
    expect(result).toEqual({ scanned: 101, reconciled: 101 });
  });

  it('stops patching once the run is aborted', async () => {
    const { investigationSweepRepository, resolveAllExecutionsTo, abortController, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1' }), investigation({ id: 'inv-2' })])
    );
    resolveAllExecutionsTo(execution(ExecutionStatus.COMPLETED));
    investigationSweepRepository.updateInSpace.mockImplementationOnce(async () => {
      abortController.abort();
    });

    const result = await run();

    expect(investigationSweepRepository.updateInSpace).toHaveBeenCalledTimes(1);
    expect(result.reconciled).toBe(1);
  });

  it('keeps going when one investigation fails to patch', async () => {
    const { investigationSweepRepository, resolveAllExecutionsTo, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1' }), investigation({ id: 'inv-2' })])
    );
    resolveAllExecutionsTo(execution(ExecutionStatus.COMPLETED));
    investigationSweepRepository.updateInSpace.mockRejectedValueOnce(
      new Error('elasticsearch unavailable')
    );

    const result = await run();

    expect(result).toEqual({ scanned: 2, reconciled: 1 });
  });

  it('treats a stale write as already reconciled', async () => {
    const { investigationSweepRepository, resolveAllExecutionsTo, run } = setup();
    investigationSweepRepository.findAcrossSpaces.mockResolvedValueOnce(
      page([investigation({ id: 'inv-1' })])
    );
    resolveAllExecutionsTo(execution(ExecutionStatus.COMPLETED));
    investigationSweepRepository.updateInSpace.mockRejectedValue(
      new InvestigationStaleWriteError('inv-1')
    );

    const result = await run();

    expect(result).toEqual({ scanned: 1, reconciled: 0 });
  });
});
