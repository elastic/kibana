/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import {
  getGetLastRunStepDefinition,
  resolveLastRunWindow,
  type WorkflowExecutionHistory,
} from './get_last_run';

const NOW = new Date('2026-10-27T12:00:00.000Z');

describe('resolveLastRunWindow', () => {
  it('starts the window when the last successful run started', () => {
    expect(
      resolveLastRunWindow({
        lastSuccess: {
          id: 'run-1',
          startedAt: '2026-10-27T09:30:00.000Z',
          finishedAt: '2026-10-27T09:40:00.000Z',
        },
        now: NOW,
      })
    ).toEqual({
      first_run: false,
      since: '2026-10-27T09:30:00.000Z',
      hours_since: 3,
      last_success: {
        execution_id: 'run-1',
        started_at: '2026-10-27T09:30:00.000Z',
        finished_at: '2026-10-27T09:40:00.000Z',
      },
    });
  });

  it('uses default_hours on the first run', () => {
    expect(resolveLastRunWindow({ now: NOW, defaultHours: 48 })).toEqual({
      first_run: true,
      since: '2026-10-25T12:00:00.000Z',
      hours_since: 48,
    });
  });

  it('never reaches further back than max_hours', () => {
    expect(
      resolveLastRunWindow({
        lastSuccess: { id: 'run-1', startedAt: '2026-09-01T00:00:00.000Z' },
        now: NOW,
        maxHours: 168,
      })
    ).toMatchObject({ since: '2026-10-20T12:00:00.000Z', hours_since: 168 });
  });
});

describe('context-engine.getLastRun', () => {
  const createContext = (input: Record<string, unknown> = {}) =>
    ({
      input,
      contextManager: {
        getContext: () => ({
          workflow: { id: 'wf-1', spaceId: 'space-1' },
          execution: { id: 'run-current' },
        }),
        getFakeRequest: () => ({}),
      },
    } as unknown as StepHandlerContext);

  it('reads completed production runs of its own workflow, skipping the current run', async () => {
    const getWorkflowExecutions = jest.fn().mockResolvedValue({
      results: [
        { id: 'run-current', startedAt: '2026-10-27T11:00:00.000Z' },
        { id: 'run-1', startedAt: '2026-10-27T09:30:00.000Z' },
      ],
    });
    const step = getGetLastRunStepDefinition({
      getExecutionHistory: async () =>
        ({ getWorkflowExecutions } as unknown as WorkflowExecutionHistory),
      isContextEngineEnabled: async () => true,
    });

    const result = await step.handler(createContext({ default_hours: 24 }));

    expect(getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-1',
        statuses: [ExecutionStatus.COMPLETED],
        executionTypes: [ExecutionType.PRODUCTION],
        sortField: 'finishedAt',
        sortOrder: 'desc',
      }),
      'space-1'
    );
    expect(result).toEqual({
      output: expect.objectContaining({
        first_run: false,
        since: '2026-10-27T09:30:00.000Z',
        last_success: expect.objectContaining({ execution_id: 'run-1' }),
      }),
    });
  });

  it('treats the run as the first one when only the current run is listed', async () => {
    const step = getGetLastRunStepDefinition({
      getExecutionHistory: async () =>
        ({
          getWorkflowExecutions: jest.fn().mockResolvedValue({
            results: [{ id: 'run-current', startedAt: '2026-10-27T11:00:00.000Z' }],
          }),
        } as unknown as WorkflowExecutionHistory),
      isContextEngineEnabled: async () => true,
    });

    const result = await step.handler(createContext());

    expect(result).toEqual({
      output: expect.objectContaining({ first_run: true, hours_since: 24 }),
    });
    expect(result.output).not.toHaveProperty('last_success');
  });

  it('fails when Context Engine is disabled in the space', async () => {
    const getExecutionHistory = jest.fn();
    const step = getGetLastRunStepDefinition({
      getExecutionHistory,
      isContextEngineEnabled: async () => false,
    });

    await expect(step.handler(createContext())).rejects.toThrow(/Context Engine is disabled/);
    expect(getExecutionHistory).not.toHaveBeenCalled();
  });

  it('fails clearly when the execution history is not available', async () => {
    const step = getGetLastRunStepDefinition({
      getExecutionHistory: async () => undefined,
      isContextEngineEnabled: async () => true,
    });

    await expect(step.handler(createContext())).rejects.toThrow(/not available/);
  });
});
