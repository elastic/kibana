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
import { getRunQuotaLedgerId, mutateRunQuotaSettings } from './repository';
import { reserveInvestigationRunQuota } from './reserve';
import {
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_MAX_ALLOWED_INVESTIGATION_KEYS,
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
  type RunQuotaLedgerAttributes,
} from './saved_objects';

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

describe('worker ledger integration', () => {
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
        })
      )
    );

    expect(results).toEqual(Array.from({ length: 20 }, () => ({ allowed: true })));
    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
    );
    expect(ledger?.count).toBe(1);
    expect(ledger?.allowedGrantKeys).toHaveLength(1);
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
        })
      )
    );

    expect(results.filter(({ allowed }) => allowed)).toHaveLength(5);
    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
    );
    expect(ledger?.count).toBe(5);
    expect(ledger?.allowedGrantKeys).toHaveLength(5);
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
    });
    const replacement = await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('replacement-child'),
      executionId: 'replacement-child',
      group: 'ki_extraction',
      spaceId: 'default',
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

  it('charges a delayed worker to the scheduled UTC day', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 1);
    const executionReader = makeExecutionReader(
      makeKiExecutions([{ id: 'ki-child', streamName: 'logs.test' }], '2026-08-31T23:59:59.900Z')
    );

    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('ki-child'),
        executionId: 'ki-child',
        group: 'ki_extraction',
        spaceId: 'default',
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

  it('reconsiders a denied worker after the limit is raised', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'ki_extraction', 1);
    const executionReader = makeExecutionReader(
      makeKiExecutions([
        { id: 'allowed-child', streamName: 'logs.allowed' },
        { id: 'denied-child', streamName: 'logs.denied' },
      ])
    );
    await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('allowed-child'),
      executionId: 'allowed-child',
      group: 'ki_extraction',
      spaceId: 'default',
    });
    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('denied-child'),
        executionId: 'denied-child',
        group: 'ki_extraction',
        spaceId: 'default',
      })
    ).resolves.toEqual({ allowed: false });
    await enableLimit(repository.client, 'ki_extraction', 2);
    await expect(
      consumeRunQuota({
        internalRepository: repository.client,
        executionReader,
        request: makeRequest('denied-child'),
        executionId: 'denied-child',
        group: 'ki_extraction',
        spaceId: 'default',
      })
    ).resolves.toEqual({ allowed: true });

    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
    );
    expect(ledger?.count).toBe(2);
    expect(ledger?.allowedGrantKeys).toHaveLength(2);
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
  }: {
    repository: ReturnType<typeof createInMemoryRunQuotaRepository>;
    eventId: string;
    eventUuid: string;
    severity?: '60-high' | '80-critical';
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
    expect(ledger?.criticalOverrideCount).toBe(0);
    expect(ledger?.allowedInvestigationKeys).toHaveLength(10);
  });

  it('tracks critical exceptions and reconsiders denials after a limit increase', async () => {
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
    ).resolves.toEqual({ granted: false, reason: 'limit' });
    await enableLimit(repository.client, 'investigation', 4);
    await expect(
      reserve({ repository, eventId: 'high-denied', eventUuid: 'uuid-4' })
    ).resolves.toEqual({ granted: true });

    const ledger = repository.getAttributes<RunQuotaLedgerAttributes>(
      RUN_QUOTA_LEDGER_SO_TYPE,
      getRunQuotaLedgerId('2026-08-31', 'investigation')
    );
    expect(ledger).toEqual(
      expect.objectContaining({
        count: 4,
        criticalOverrideCount: 1,
      })
    );
    expect(ledger?.allowedInvestigationKeys).toHaveLength(4);
  });

  it('does not charge an accepted investigation twice', async () => {
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

    expect(first).toEqual({ granted: true });
    expect(replay).toEqual(first);
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'investigation')
      )?.count
    ).toBe(1);
  });

  it('does not evict accepted investigations at the storage boundary', async () => {
    const repository = createInMemoryRunQuotaRepository();
    await enableLimit(repository.client, 'investigation', 10_000);
    const allowedInvestigationKeys = Array.from(
      { length: RUN_QUOTA_MAX_ALLOWED_INVESTIGATION_KEYS },
      (_, index) => ({ eventUuid: `uuid-${index}`, eventId: `event-${index}` })
    );
    repository.seed(RUN_QUOTA_LEDGER_SO_TYPE, getRunQuotaLedgerId('2026-08-31', 'investigation'), {
      date: '2026-08-31',
      group: 'investigation',
      count: RUN_QUOTA_MAX_ALLOWED_INVESTIGATION_KEYS,
      criticalOverrideCount: 0,
      allowedGrantKeys: [],
      allowedInvestigationKeys,
    });

    await expect(
      reserve({
        repository,
        eventId: 'critical-event',
        eventUuid: 'critical-uuid',
        severity: '80-critical',
      })
    ).rejects.toThrow('cannot record another accepted investigation');
    expect(logger.info).not.toHaveBeenCalled();
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'investigation')
      )
    ).toEqual(expect.objectContaining({ count: 10_000, allowedInvestigationKeys }));
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
      waitForEvidence,
    });

    expect(result).toEqual({ granted: false, reason: 'ineligible' });
    expect(
      repository.getAttributes(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'investigation')
      )
    ).toBeUndefined();
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
    });
    await mutateRunQuotaSettings(repository.client, () => ({ enforcementEnabled: false }));
    await consumeRunQuota({
      internalRepository: repository.client,
      executionReader,
      request: makeRequest('child-2'),
      executionId: 'child-2',
      group: 'ki_extraction',
      spaceId: 'default',
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
      })
    ).resolves.toEqual({ allowed: false });
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
      )?.count
    ).toBe(1);
    const { grantKey } = await validateWorkerProvenance({
      request: makeRequest('child-2'),
      executionId: 'child-2',
      group: 'ki_extraction',
      spaceId: 'default',
      executionReader,
    });
    expect(
      repository.getAttributes<RunQuotaLedgerAttributes>(
        RUN_QUOTA_LEDGER_SO_TYPE,
        getRunQuotaLedgerId('2026-08-31', 'ki_extraction')
      )?.allowedGrantKeys
    ).not.toContain(grantKey);
    expect(
      repository.getAttributes(RUN_QUOTA_SETTINGS_SO_TYPE, RUN_QUOTA_SETTINGS_SO_ID)
    ).toBeDefined();
  });
});
