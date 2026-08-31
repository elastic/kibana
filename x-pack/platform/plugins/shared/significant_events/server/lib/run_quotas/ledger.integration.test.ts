/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER } from '@kbn/workflows-extensions/server';
import { consumeRunQuota } from './consume';
import { createInMemoryRunQuotaRepository } from './in_memory_repository.test_utils';
import type { RunQuotaExecutionReader, RunQuotaWorkflowExecution } from './provenance';
import { validateWorkerProvenance } from './provenance';
import { getRunQuotaLedgerId, mutateRunQuotaLedger, mutateRunQuotaSettings } from './repository';
import { reserveInvestigationRunQuota } from './reserve';
import { deleteExpiredRunQuotaDocuments } from './retention';
import {
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_MAX_DECISIONS,
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
  RUN_QUOTA_WORKER_DECISION_SO_TYPE,
  type RunQuotaLedgerAttributes,
  type RunQuotaWorkerDecisionAttributes,
} from './saved_objects';
import {
  finalizeWorkerDecision,
  getOrCreatePendingWorkerDecision,
  getRunQuotaWorkerDecisionId,
} from './worker_decision';

const makeRequest = (executionId: string): KibanaRequest =>
  ({
    headers: {
      [EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER]: executionId,
    },
  } as unknown as KibanaRequest);

const makeExecutionReader = (executions: RunQuotaWorkflowExecution[]): RunQuotaExecutionReader => {
  const byId = new Map(executions.map((execution) => [execution.id, execution]));
  return {
    getExecution: jest.fn(async (id) => byId.get(id)),
    getStepExecutions: jest.fn().mockResolvedValue([]),
  };
};

const makeKiExecutions = (
  children: Array<{ id: string; streamName: string }>,
  taskRunAt = '2026-08-31T10:00:00.000Z'
): RunQuotaWorkflowExecution[] => [
  ...children.map(
    ({ id, streamName }): RunQuotaWorkflowExecution => ({
      id,
      workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
      spaceId: 'default',
      status: ExecutionStatus.RUNNING,
      context: {
        parentWorkflowExecutionId: 'ki-parent',
        inputs: { streamName },
      },
    })
  ),
  {
    id: 'ki-parent',
    workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    spaceId: 'default',
    status: ExecutionStatus.RUNNING,
    triggeredBy: 'scheduled',
    taskRunAt,
  },
];

const makeDetectionExecutions = (): RunQuotaWorkflowExecution[] => [
  {
    id: 'discovery',
    workflowId: SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
    spaceId: 'space-a',
    status: ExecutionStatus.RUNNING,
    context: {
      parentWorkflowExecutionId: 'review-parent',
      inputs: { quotaSlot: 0 },
    },
  },
  {
    id: 'review-parent',
    workflowId: `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-space-a`,
    spaceId: 'space-a',
    status: ExecutionStatus.RUNNING,
    triggeredBy: 'scheduled',
    taskRunAt: '2026-08-31T10:00:00.000Z',
  },
];

const enableLimit = async (
  repository: ReturnType<typeof createInMemoryRunQuotaRepository>['client'],
  group: 'detection' | 'investigation' | 'ki_extraction',
  max: number
) => {
  await mutateRunQuotaSettings(repository, () => ({
    enforcementEnabled: true,
    limits: { [group]: { enabled: true, max } },
  }));
};

describe('worker decision and ledger integration', () => {
  it('converges concurrent calls for one logical grant key', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 10);
    const executionReader = makeExecutionReader(
      makeKiExecutions([{ id: 'ki-child', streamName: 'logs.test' }])
    );

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        consumeRunQuota({
          internalRepository: repository.client,
          executionReader,
          request: makeRequest('ki-child'),
          executionId: 'ki-child',
          group: 'ki_extraction',
          spaceId: 'default',
          now: new Date('2026-08-31T12:00:00.000Z'),
        })
      )
    );

    expect(results).toEqual(Array.from({ length: 20 }, () => ({ allowed: true })));
    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
    );
    expect(ledger?.count).toBe(1);
    expect(ledger?.consumedGrantKeys).toHaveLength(1);
  });

  it('never over-grants concurrent distinct worker keys', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 5);
    const children = Array.from({ length: 20 }, (_, index) => ({
      id: `ki-child-${index}`,
      streamName: `logs.stream-${index}`,
    }));
    const executionReader = makeExecutionReader(makeKiExecutions(children));

    const results = await Promise.all(
      children.map(({ id }) =>
        consumeRunQuota({
          internalRepository: repository.client,
          executionReader,
          request: makeRequest(id),
          executionId: id,
          group: 'ki_extraction',
          spaceId: 'default',
          now: new Date('2026-08-31T12:00:00.000Z'),
        })
      )
    );

    expect(results.filter(({ allowed }) => allowed)).toHaveLength(5);
    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
    );
    expect(ledger?.count).toBe(5);
    expect(ledger?.consumedGrantKeys).toHaveLength(5);
  });

  it('replays a stable decision for Task Manager recovery with a fresh execution id', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 10);
    const executionReader = makeExecutionReader(
      makeKiExecutions([
        { id: 'original-child', streamName: 'logs.test' },
        { id: 'replacement-child', streamName: 'logs.test' },
      ])
    );

    const original = await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('original-child'),
      executionId: 'original-child',
      group: 'ki_extraction',
      spaceId: 'default',
      now: new Date('2026-08-31T12:00:00.000Z'),
    });
    const replacement = await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('replacement-child'),
      executionId: 'replacement-child',
      group: 'ki_extraction',
      spaceId: 'default',
      now: new Date('2026-08-31T12:05:00.000Z'),
    });

    expect(original).toEqual({ allowed: true });
    expect(replacement).toEqual({ allowed: true });
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
      )?.count
    ).toBe(1);
  });

  it('resumes a pending pre-ledger decision against its recorded day after midnight', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 1);
    const executionReader = makeExecutionReader(
      makeKiExecutions([{ id: 'ki-child', streamName: 'logs.test' }])
    );
    const { grantKey } = await validateWorkerProvenance({
      request: makeRequest('ki-child'),
      executionId: 'ki-child',
      group: 'ki_extraction',
      spaceId: 'default',
      executionReader,
    });
    await getOrCreatePendingWorkerDecision({
      internalRepository: repository.client,
      group: 'ki_extraction',
      grantKey,
      executionId: 'ki-child',
      ledgerDate: '2026-08-31',
      limitSnapshot: 1,
      createdAt: '2026-08-31T23:59:59.900Z',
    });

    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('ki-child'),
        executionId: 'ki-child',
        group: 'ki_extraction',
        spaceId: 'default',
        now: new Date('2026-09-01T00:00:00.100Z'),
      })
    ).resolves.toEqual({ allowed: true });
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
      )?.count
    ).toBe(1);
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-09-01', 'ki_extraction')
      )
    ).toBeUndefined();
  });

  it('recovers after ledger mutation but before finalization without double counting', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 1);
    const executionReader = makeExecutionReader(
      makeKiExecutions([{ id: 'ki-child', streamName: 'logs.test' }])
    );
    const { grantKey } = await validateWorkerProvenance({
      request: makeRequest('ki-child'),
      executionId: 'ki-child',
      group: 'ki_extraction',
      spaceId: 'default',
      executionReader,
    });
    await getOrCreatePendingWorkerDecision({
      internalRepository: repository.client,
      group: 'ki_extraction',
      grantKey,
      executionId: 'ki-child',
      ledgerDate: '2026-08-31',
      limitSnapshot: 1,
      createdAt: '2026-08-31T23:59:59.900Z',
    });
    await mutateRunQuotaLedger({
      internalRepository: repository.client,
      date: '2026-08-31',
      group: 'ki_extraction',
      mutation: (ledger) => ({
        count: ledger.count + 1,
        consumedGrantKeys: [...ledger.consumedGrantKeys, grantKey],
      }),
    });

    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('ki-child'),
        executionId: 'ki-child',
        group: 'ki_extraction',
        spaceId: 'default',
        now: new Date('2026-09-01T00:00:00.100Z'),
      })
    ).resolves.toEqual({ allowed: true });
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
      )?.count
    ).toBe(1);
  });

  it('uses the pending decision limit snapshot after an administrator edit', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 2);
    const executionReader = makeExecutionReader(
      makeKiExecutions([
        { id: 'first-child', streamName: 'logs.first' },
        { id: 'pending-child', streamName: 'logs.pending' },
      ])
    );
    await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('first-child'),
      executionId: 'first-child',
      group: 'ki_extraction',
      spaceId: 'default',
      now: new Date('2026-08-31T12:00:00.000Z'),
    });
    const { grantKey } = await validateWorkerProvenance({
      request: makeRequest('pending-child'),
      executionId: 'pending-child',
      group: 'ki_extraction',
      spaceId: 'default',
      executionReader,
    });
    await getOrCreatePendingWorkerDecision({
      internalRepository: repository.client,
      group: 'ki_extraction',
      grantKey,
      executionId: 'pending-child',
      ledgerDate: '2026-08-31',
      limitSnapshot: 2,
      createdAt: '2026-08-31T12:01:00.000Z',
    });
    await enableLimit(repository.client, 'ki_extraction', 1);

    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('pending-child'),
        executionId: 'pending-child',
        group: 'ki_extraction',
        spaceId: 'default',
        now: new Date('2026-08-31T12:02:00.000Z'),
      })
    ).resolves.toEqual({ allowed: true });
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
      )?.count
    ).toBe(2);
  });

  it('grants valid workers without ledger writes while enforcement is off or uncapped', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const executionReader = makeExecutionReader(makeDetectionExecutions());

    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('discovery'),
        executionId: 'discovery',
        group: 'detection',
        spaceId: 'space-a',
      })
    ).resolves.toEqual({ allowed: true });
    await mutateRunQuotaSettings(repository.client, () => ({
      enforcementEnabled: true,
      limits: { detection: { enabled: false, max: 0 } },
    }));
    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('discovery'),
        executionId: 'discovery',
        group: 'detection',
        spaceId: 'space-a',
      })
    ).resolves.toEqual({ allowed: true });
    expect(
      repository.getAttributes(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'detection')
      )
    ).toBeUndefined();
  });

  it('preserves unknown fields while finalizing a worker decision', async () => {
    const repository = createInMemoryRunQuotaRepository();
    const grantKey = 'grant-key';
    repository.seed(RUN_QUOTA_WORKER_DECISION_SO_TYPE, getRunQuotaWorkerDecisionId(grantKey), {
      ledgerDate: '2026-08-31',
      group: 'detection',
      grantKey,
      latestExecutionId: 'execution',
      state: 'pending',
      limitSnapshot: 100,
      createdAt: '2026-08-31T12:00:00.000Z',
      futureTopLevel: { retained: true },
    });

    const result = await finalizeWorkerDecision({
      internalRepository: repository.client,
      grantKey,
      executionId: 'execution',
      allowed: true,
      decidedAt: '2026-08-31T12:01:00.000Z',
    });

    expect(result.state).toBe('allowed');
    expect(result.futureTopLevel).toEqual({ retained: true });
  });
});

describe('investigation ledger integration', () => {
  const logger = {
    info: jest.fn(),
  } as unknown as Logger;
  const executionReader = makeExecutionReader(makeDetectionExecutions());
  const waitForEvidence = jest.fn().mockResolvedValue(undefined);

  const reserve = ({
    repository,
    eventId,
    eventUuid,
    severity = '60-high',
    now = new Date('2026-08-31T12:00:00.000Z'),
  }: {
    repository: ReturnType<typeof createInMemoryRunQuotaRepository>;
    eventId: string;
    eventUuid: string;
    severity?: '60-high' | '80-critical';
    now?: Date;
  }) =>
    reserveInvestigationRunQuota({
      internalRepository: repository.client,
      executionReader,
      eventResolver: {
        resolveInvestigatableEvent: jest.fn().mockResolvedValue({ eligible: true, severity }),
      },
      request: makeRequest('discovery'),
      executionId: 'discovery',
      eventId,
      eventUuid,
      spaceId: 'space-a',
      actor: 'elastic',
      logger,
      now,
      waitForEvidence,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    waitForEvidence.mockResolvedValue(undefined);
  });

  it('never over-grants concurrent regular events', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'investigation', 10);

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, index) =>
        reserve({
          repository,
          eventId: `event-${index}`,
          eventUuid: `uuid-${index}`,
        })
      )
    );

    expect(results.filter(({ granted }) => granted)).toHaveLength(10);
    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'investigation')
    );
    expect(ledger?.count).toBe(10);
    expect(ledger?.withinLimitGrantCount).toBe(10);
    expect(ledger?.criticalPastLimitGrantCount).toBe(0);
    expect(ledger?.totalSkipped).toBe(40);
  });

  it('preserves admission-time grant arithmetic through limit changes', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'investigation', 2);

    await reserve({
      repository,
      eventId: 'critical-within',
      eventUuid: 'uuid-1',
      severity: '80-critical',
    });
    await reserve({ repository, eventId: 'high-within', eventUuid: 'uuid-2' });
    await reserve({
      repository,
      eventId: 'critical-past',
      eventUuid: 'uuid-3',
      severity: '80-critical',
    });
    await enableLimit(repository.client, 'investigation', 1);
    await expect(
      reserve({ repository, eventId: 'high-denied', eventUuid: 'uuid-4' })
    ).resolves.toEqual({ granted: false, pastLimit: false, reason: 'limit' });
    await enableLimit(repository.client, 'investigation', 4);
    await reserve({ repository, eventId: 'high-after-raise', eventUuid: 'uuid-5' });

    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'investigation')
    );
    expect(ledger).toEqual(
      expect.objectContaining({
        count: 4,
        withinLimitGrantCount: 3,
        criticalPastLimitGrantCount: 1,
        totalSkipped: 1,
      })
    );
    expect(ledger?.count).toBe(
      (ledger?.withinLimitGrantCount ?? 0) + (ledger?.criticalPastLimitGrantCount ?? 0)
    );
  });

  it('replays a reservation decision without incrementing twice', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'investigation', 1);

    const first = await reserve({
      repository,
      eventId: 'event-1',
      eventUuid: 'uuid-1',
    });
    const replay = await reserve({
      repository,
      eventId: 'event-1',
      eventUuid: 'uuid-1',
    });

    expect(first).toEqual({ granted: true, pastLimit: false });
    expect(replay).toEqual(first);
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'investigation')
      )?.count
    ).toBe(1);
  });

  it('evicts only the oldest decisions at the 500-decision boundary and keeps counting', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'investigation', 10_000);

    for (let index = 0; index <= RUN_QUOTA_MAX_DECISIONS; index++) {
      await reserve({
        repository,
        eventId: `event-${index}`,
        eventUuid: `uuid-${index}`,
      });
    }

    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'investigation')
    );
    expect(ledger?.count).toBe(501);
    expect(ledger?.decisions).toHaveLength(RUN_QUOTA_MAX_DECISIONS);
    expect(ledger?.decisions[0].eventUuid).toBe('uuid-1');
    expect(ledger?.decisionsEvicted).toBe(true);
  });

  it('returns ineligible without a ledger mutation', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'investigation', 10);

    const result = await reserveInvestigationRunQuota({
      internalRepository: repository.client,
      executionReader,
      eventResolver: {
        resolveInvestigatableEvent: jest.fn().mockResolvedValue({ eligible: false }),
      },
      request: makeRequest('discovery'),
      executionId: 'discovery',
      eventId: 'event',
      eventUuid: 'uuid',
      spaceId: 'space-a',
      actor: 'elastic',
      logger,
      now: new Date('2026-08-31T12:00:00.000Z'),
      waitForEvidence,
    });

    expect(result).toEqual({ granted: false, pastLimit: false, reason: 'ineligible' });
    expect(
      repository.getAttributes(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'investigation')
      )
    ).toBeUndefined();
  });
});

describe('retention pagination', () => {
  it('drains page one while deleting so documents are not skipped', async () => {
    const idsByType = new Map<string, string[]>([
      [RUN_QUOTA_LEDGER_SO_TYPE, Array.from({ length: 250 }, (_, index) => `ledger-${index}`)],
      [
        RUN_QUOTA_WORKER_DECISION_SO_TYPE,
        Array.from({ length: 150 }, (_, index) => `decision-${index}`),
      ],
    ]);
    const find = jest.fn(async ({ type, page, perPage }) => {
      const ids = idsByType.get(type as string) ?? [];
      return {
        page,
        per_page: perPage,
        total: ids.length,
        saved_objects: ids.slice(0, perPage).map((id) => ({
          id,
          type,
          attributes: {},
          references: [],
        })),
      };
    });
    const deleteSavedObject = jest.fn(async (type: string, id: string) => {
      idsByType.set(
        type,
        (idsByType.get(type) ?? []).filter((candidate) => candidate !== id)
      );
      return {};
    });

    await expect(
      deleteExpiredRunQuotaDocuments({
        internalRepository: {
          find,
          delete: deleteSavedObject,
        } as never,
        cutoffDay: '2026-08-24',
      })
    ).resolves.toBe(400);
    expect([...idsByType.values()].flat()).toHaveLength(0);
    expect(find.mock.calls.every(([request]) => request.page === 1)).toBe(true);
  });
});

describe('switch and limit persistence', () => {
  it('keeps the daily ledger through disable and same-day re-enable', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 1);
    const executionReader = makeExecutionReader(
      makeKiExecutions([
        { id: 'child-1', streamName: 'logs.one' },
        { id: 'child-2', streamName: 'logs.two' },
      ])
    );

    await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('child-1'),
      executionId: 'child-1',
      group: 'ki_extraction',
      spaceId: 'default',
      now: new Date('2026-08-31T12:00:00.000Z'),
    });
    await mutateRunQuotaSettings(repository.client, () => ({ enforcementEnabled: false }));
    await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('child-2'),
      executionId: 'child-2',
      group: 'ki_extraction',
      spaceId: 'default',
      now: new Date('2026-08-31T12:01:00.000Z'),
    });
    await mutateRunQuotaSettings(repository.client, () => ({ enforcementEnabled: true }));

    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('child-2'),
        executionId: 'child-2',
        group: 'ki_extraction',
        spaceId: 'default',
        now: new Date('2026-08-31T12:02:00.000Z'),
      })
    ).resolves.toEqual({ allowed: false });
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
      )?.count
    ).toBe(1);
    expect(
      repository.getAttributes<RunQuotaWorkerDecisionAttributes>(
        RUN_QUOTA_WORKER_DECISION_SO_TYPE,
        getRunQuotaWorkerDecisionId(
          (
            await validateWorkerProvenance({
              request: makeRequest('child-2'),
              executionId: 'child-2',
              group: 'ki_extraction',
              spaceId: 'default',
              executionReader,
            })
          ).grantKey
        )
      )?.state
    ).toBe('denied');
    expect(
      repository.getAttributes(RUN_QUOTA_SETTINGS_SO_TYPE, RUN_QUOTA_SETTINGS_SO_ID)
    ).toBeDefined();
  });
});
