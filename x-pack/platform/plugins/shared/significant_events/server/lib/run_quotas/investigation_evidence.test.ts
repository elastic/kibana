/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, type EsWorkflowStepExecution } from '@kbn/workflows';
import type { RunQuotaExecutionReader } from './provenance';
import { waitForInvestigationEvidence } from './investigation_evidence';

const makeStoreStep = (
  significantEvents: Array<Record<string, unknown>>
): EsWorkflowStepExecution =>
  ({
    id: 'step-execution',
    stepId: 'store_significant_events',
    stepExecutionIndex: 0,
    output: { significant_events: significantEvents },
  } as unknown as EsWorkflowStepExecution);

describe('waitForInvestigationEvidence', () => {
  it('polls real-time execution state until the exact written event pair appears', async () => {
    const executionReader: RunQuotaExecutionReader = {
      getExecution: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'execution',
          workflowId: 'workflow',
          spaceId: 'default',
          status: ExecutionStatus.RUNNING,
          stepExecutionIds: [],
        })
        .mockResolvedValue({
          id: 'execution',
          workflowId: 'workflow',
          spaceId: 'default',
          status: ExecutionStatus.RUNNING,
          stepExecutionIds: ['step-execution'],
        }),
      getStepExecutions: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue([
          makeStoreStep([
            {
              event_id: 'event-id',
              event_uuid: 'event-uuid',
              status: 'open',
              written: true,
            },
          ]),
        ]),
    };
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      waitForInvestigationEvidence({
        executionReader,
        executionId: 'execution',
        eventId: 'event-id',
        eventUuid: 'event-uuid',
        sleep,
      })
    ).resolves.toBeUndefined();
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it.each([
    [
      'different uuid',
      {
        event_id: 'event-id',
        event_uuid: 'different',
        status: 'open',
        written: true,
      },
    ],
    [
      'unwritten event',
      {
        event_id: 'event-id',
        event_uuid: 'event-uuid',
        status: 'open',
        written: false,
      },
    ],
    [
      'closed event',
      {
        event_id: 'event-id',
        event_uuid: 'event-uuid',
        status: 'closed',
        written: true,
      },
    ],
  ])('rejects evidence for a %s', async (_name, event) => {
    const executionReader: RunQuotaExecutionReader = {
      getExecution: jest.fn().mockResolvedValue({
        id: 'execution',
        workflowId: 'workflow',
        spaceId: 'default',
        status: ExecutionStatus.RUNNING,
        stepExecutionIds: ['step-execution'],
      }),
      getStepExecutions: jest.fn().mockResolvedValue([makeStoreStep([event])]),
    };
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      waitForInvestigationEvidence({
        executionReader,
        executionId: 'execution',
        eventId: 'event-id',
        eventUuid: 'event-uuid',
        pollTimeoutMs: 200,
        pollIntervalMs: 100,
        sleep,
      })
    ).rejects.toThrow('no persisted evidence');
    expect(executionReader.getExecution).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
