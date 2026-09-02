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

const makeKiExecutions = ({
  spaceId = 'default',
  streamName = 'logs.test',
}: {
  spaceId?: string;
  streamName?: string;
} = {}): RunQuotaWorkflowExecution[] => [
  {
    id: 'ki-child',
    workflowId: SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID,
    spaceId,
    status: ExecutionStatus.RUNNING,
    context: {
      parentWorkflowExecutionId: 'ki-parent',
      inputs: { streamName },
    },
  },
  {
    id: 'ki-parent',
    workflowId: SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID,
    spaceId,
    status: ExecutionStatus.RUNNING,
    triggeredBy: 'scheduled',
    taskRunAt: '2026-08-31T10:00:00.000Z',
  },
];

describe('validateWorkerProvenance', () => {
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
    [
      'invalid scheduled timestamp',
      makeDetectionExecutions({ parentTaskRunAt: 'not-a-date' }),
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
    await expect(
      validateWorkerProvenance({
        request: makeRequest('ki-child'),
        executionId: 'ki-child',
        group: 'ki_extraction',
        spaceId: 'default',
        executionReader: makeExecutionReader(makeKiExecutions({ streamName: 'Logs Invalid' })),
      })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });
  });

  it('uses distinct KI grant keys for the same stream in different spaces', async () => {
    const grantKeyForSpace = async (spaceId: string) => {
      const { grantKey } = await validateWorkerProvenance({
        request: makeRequest('ki-child'),
        executionId: 'ki-child',
        group: 'ki_extraction',
        spaceId,
        executionReader: makeExecutionReader(makeKiExecutions({ spaceId })),
      });
      return grantKey;
    };

    const [spaceAKey, spaceBKey] = await Promise.all([
      grantKeyForSpace('space-a'),
      grantKeyForSpace('space-b'),
    ]);

    expect(spaceAKey).not.toBe(spaceBKey);
  });
});
