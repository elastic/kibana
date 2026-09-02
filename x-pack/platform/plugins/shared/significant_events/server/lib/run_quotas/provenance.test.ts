/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import {
  SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
  SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { EVENT_CHAIN_EMITTER_EXECUTION_ID_HEADER } from '@kbn/workflows-extensions/server';
import {
  validateHeartbeatProvenance,
  validateWorkerProvenance,
  type RunQuotaExecutionReader,
  type RunQuotaWorkflowExecution,
} from './provenance';

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

const makeDetectionExecutions = ({
  childId = 'child-1',
  childSpace = 'space-a',
  childStatus = ExecutionStatus.RUNNING,
  childWorkflowId = SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID,
  parentWorkflowId = `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-space-a`,
  parentTriggeredBy = 'scheduled',
  parentTaskRunAt = '2026-08-31T10:00:00.000Z',
  quotaSlot = 3,
}: {
  childId?: string;
  childSpace?: string;
  childStatus?: ExecutionStatus;
  childWorkflowId?: string;
  parentWorkflowId?: string;
  parentTriggeredBy?: string;
  parentTaskRunAt?: string | null;
  quotaSlot?: unknown;
} = {}): RunQuotaWorkflowExecution[] => [
  {
    id: childId,
    workflowId: childWorkflowId,
    spaceId: childSpace,
    status: childStatus,
    context: {
      parentWorkflowExecutionId: 'parent-1',
      inputs: { quotaSlot },
    },
  },
  {
    id: 'parent-1',
    workflowId: parentWorkflowId,
    spaceId: 'space-a',
    status: ExecutionStatus.RUNNING,
    triggeredBy: parentTriggeredBy,
    taskRunAt: parentTaskRunAt,
  },
];

describe('validateWorkerProvenance', () => {
  it('derives the same detection grant key for replacement worker executions', async () => {
    const first = makeDetectionExecutions({ childId: 'child-1' });
    const replacement = makeDetectionExecutions({ childId: 'child-2' });

    const firstResult = await validateWorkerProvenance({
      request: makeRequest('child-1'),
      executionId: 'child-1',
      group: 'detection',
      spaceId: 'space-a',
      executionReader: makeExecutionReader(first),
    });
    const replacementResult = await validateWorkerProvenance({
      request: makeRequest('child-2'),
      executionId: 'child-2',
      group: 'detection',
      spaceId: 'space-a',
      executionReader: makeExecutionReader(replacement),
    });

    expect(firstResult.grantKey).toBe(replacementResult.grantKey);
  });

  it('derives KI identity from the scheduled occurrence and canonical stream name', async () => {
    const executions: RunQuotaWorkflowExecution[] = [
      {
        id: 'ki-child',
        workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
        spaceId: 'default',
        status: ExecutionStatus.RUNNING,
        context: {
          parentWorkflowExecutionId: 'ki-parent',
          inputs: { streamName: 'logs.production' },
        },
      },
      {
        id: 'ki-parent',
        workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        spaceId: 'default',
        status: ExecutionStatus.COMPLETED,
        triggeredBy: 'scheduled',
        taskRunAt: '2026-08-31T10:00:00.000Z',
      },
    ];

    await expect(
      validateWorkerProvenance({
        request: makeRequest('ki-child'),
        executionId: 'ki-child',
        group: 'ki_extraction',
        spaceId: 'default',
        executionReader: makeExecutionReader(executions),
      })
    ).resolves.toEqual(expect.objectContaining({ grantKey: expect.any(String) }));
  });

  it.each([
    ['forged emitter id', makeDetectionExecutions(), makeRequest('other'), 'detection', 'space-a'],
    [
      'manual worker without a parent',
      [
        {
          ...makeDetectionExecutions()[0],
          context: { inputs: { quotaSlot: 3 } },
        },
      ],
      makeRequest('child-1'),
      'detection',
      'space-a',
    ],
    [
      'hand-run managed driver',
      makeDetectionExecutions({ parentTriggeredBy: 'manual' }),
      makeRequest('child-1'),
      'detection',
      'space-a',
    ],
    [
      'custom scheduled parent',
      makeDetectionExecutions({ parentWorkflowId: 'custom-scheduled-parent' }),
      makeRequest('child-1'),
      'detection',
      'space-a',
    ],
    [
      'wrong-space worker',
      makeDetectionExecutions({ childSpace: 'space-b' }),
      makeRequest('child-1'),
      'detection',
      'space-a',
    ],
    [
      'wrong worker group',
      makeDetectionExecutions(),
      makeRequest('child-1'),
      'ki_extraction',
      'space-a',
    ],
    [
      'terminal worker',
      makeDetectionExecutions({ childStatus: ExecutionStatus.COMPLETED }),
      makeRequest('child-1'),
      'detection',
      'space-a',
    ],
    [
      'out-of-range slot',
      makeDetectionExecutions({ quotaSlot: 20 }),
      makeRequest('child-1'),
      'detection',
      'space-a',
    ],
    [
      'string slot',
      makeDetectionExecutions({ quotaSlot: '3' }),
      makeRequest('child-1'),
      'detection',
      'space-a',
    ],
  ] as const)('rejects a %s', async (_name, executions, request, group, spaceId) => {
    await expect(
      validateWorkerProvenance({
        request,
        executionId: 'child-1',
        group,
        spaceId,
        executionReader: makeExecutionReader([...executions]),
      })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
  });

  it('rejects an invalid KI stream name', async () => {
    const executions: RunQuotaWorkflowExecution[] = [
      {
        id: 'ki-child',
        workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
        spaceId: 'default',
        status: ExecutionStatus.RUNNING,
        context: {
          parentWorkflowExecutionId: 'ki-parent',
          inputs: { streamName: 'Logs Invalid' },
        },
      },
      {
        id: 'ki-parent',
        workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
        spaceId: 'default',
        status: ExecutionStatus.RUNNING,
        triggeredBy: 'scheduled',
        taskRunAt: '2026-08-31T10:00:00.000Z',
      },
    ];

    await expect(
      validateWorkerProvenance({
        request: makeRequest('ki-child'),
        executionId: 'ki-child',
        group: 'ki_extraction',
        spaceId: 'default',
        executionReader: makeExecutionReader(executions),
      })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
  });
});

describe('validateHeartbeatProvenance', () => {
  it('uses the persisted task run timestamp', async () => {
    const execution: RunQuotaWorkflowExecution = {
      id: 'driver',
      workflowId: `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-space-a`,
      spaceId: 'space-a',
      status: ExecutionStatus.RUNNING,
      triggeredBy: 'scheduled',
      taskRunAt: '2026-08-31T10:00:00.000Z',
    };

    await expect(
      validateHeartbeatProvenance({
        request: makeRequest('driver'),
        executionId: 'driver',
        group: 'detection',
        spaceId: 'space-a',
        executionReader: makeExecutionReader([execution]),
      })
    ).resolves.toEqual({
      execution,
      recordedAt: '2026-08-31T10:00:00.000Z',
    });
  });

  it('rejects a terminal driver', async () => {
    const execution: RunQuotaWorkflowExecution = {
      id: 'driver',
      workflowId: `${SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID}-space-a`,
      spaceId: 'space-a',
      status: ExecutionStatus.COMPLETED,
      triggeredBy: 'scheduled',
      taskRunAt: '2026-08-31T10:00:00.000Z',
    };

    await expect(
      validateHeartbeatProvenance({
        request: makeRequest('driver'),
        executionId: 'driver',
        group: 'detection',
        spaceId: 'space-a',
        executionReader: makeExecutionReader([execution]),
      })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
  });
});
