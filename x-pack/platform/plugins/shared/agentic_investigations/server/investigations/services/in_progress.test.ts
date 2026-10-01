/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { AgentExecutionMode, ExecutionStatus } from '@kbn/agent-builder-common';
import type { AgentExecution, ExecutionStart } from '@kbn/agent-builder-server';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import {
  InvestigationDriverWorkflowRegistry,
  parseInvestigationConcurrencyKey,
} from './driver_workflows';
import { InProgressResolver, STALE_AGENT_HEARTBEAT_MS } from './in_progress';

const request = httpServerMock.createKibanaRequest();
const SPACE_ID = 'space-1';
const NOW = Date.parse('2026-01-01T12:00:00.000Z');

const conversationExecution = (
  conversationId: string,
  overrides: Partial<AgentExecution> = {}
): AgentExecution =>
  ({
    executionId: `exec-${conversationId}`,
    executionMode: AgentExecutionMode.conversation,
    status: ExecutionStatus.running,
    agentParams: { conversationId },
    ...overrides,
  } as AgentExecution);

const setup = ({
  executions = [],
  workflowExecutions = {},
  withWorkflows = true,
  driverWorkflowIds = ['driver-1'],
}: {
  executions?: AgentExecution[];
  workflowExecutions?: Record<string, Array<{ concurrencyGroupKey?: string }>>;
  withWorkflows?: boolean;
  driverWorkflowIds?: string[];
} = {}) => {
  const findExecutions = jest.fn().mockResolvedValue(executions);
  const getWorkflowExecutions = jest.fn(async ({ workflowId }: { workflowId: string }) => ({
    results: workflowExecutions[workflowId] ?? [],
  }));
  const driverWorkflows = new InvestigationDriverWorkflowRegistry();
  driverWorkflowIds.forEach((id) => driverWorkflows.register(id));
  const logger = loggerMock.create();
  const resolver = new InProgressResolver({
    getAgentExecutions: () => ({ findExecutions } as unknown as ExecutionStart),
    getWorkflowsManagement: () =>
      withWorkflows ? ({ getWorkflowExecutions } as never) : undefined,
    driverWorkflows,
    logger,
    now: () => NOW,
  });
  return { resolver, findExecutions, getWorkflowExecutions, logger };
};

describe('parseInvestigationConcurrencyKey', () => {
  it('returns the investigation id after the prefix', () => {
    expect(parseInvestigationConcurrencyKey('investigation:abc')).toBe('abc');
  });

  it('ignores other keys and an empty id', () => {
    expect(parseInvestigationConcurrencyKey('alert:abc')).toBeUndefined();
    expect(parseInvestigationConcurrencyKey('investigation:')).toBeUndefined();
    expect(parseInvestigationConcurrencyKey(undefined)).toBeUndefined();
  });
});

describe('InvestigationDriverWorkflowRegistry', () => {
  it('lists each registered workflow once', () => {
    const registry = new InvestigationDriverWorkflowRegistry();
    registry.register('a');
    registry.register('a');
    registry.register('b');
    expect(registry.list()).toEqual(['a', 'b']);
  });

  it('rejects an empty id', () => {
    expect(() => new InvestigationDriverWorkflowRegistry().register('')).toThrow();
  });
});

describe('InProgressResolver', () => {
  it('unions running agent conversations and non-terminal driver workflow executions', async () => {
    const { resolver, findExecutions, getWorkflowExecutions } = setup({
      executions: [conversationExecution('conv-a')],
      workflowExecutions: {
        'driver-1': [{ concurrencyGroupKey: 'investigation:conv-b' }, { concurrencyGroupKey: 'x' }],
      },
    });

    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(
      new Set(['conv-a', 'conv-b'])
    );
    expect(findExecutions).toHaveBeenCalledWith(request, {
      spaceId: SPACE_ID,
      filter: { status: [ExecutionStatus.scheduled, ExecutionStatus.running] },
      size: 1000,
    });
    expect(getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'driver-1',
        statuses: [...NonTerminalExecutionStatuses],
        omitStepRuns: true,
        size: 1000,
        request,
      }),
      SPACE_ID
    );
  });

  it('queries every registered driver workflow', async () => {
    const { resolver, getWorkflowExecutions } = setup({
      driverWorkflowIds: ['driver-1', 'driver-2'],
      workflowExecutions: { 'driver-2': [{ concurrencyGroupKey: 'investigation:conv-c' }] },
    });

    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(
      new Set(['conv-c'])
    );
    expect(getWorkflowExecutions).toHaveBeenCalledTimes(2);
  });

  it('drops standalone executions and running executions with a stale heartbeat', async () => {
    const stale = new Date(NOW - STALE_AGENT_HEARTBEAT_MS - 1).toISOString();
    const fresh = new Date(NOW - 1000).toISOString();
    const { resolver } = setup({
      executions: [
        conversationExecution('conv-stale', { lastHeartbeat: stale }),
        conversationExecution('conv-fresh', { lastHeartbeat: fresh }),
        conversationExecution('conv-scheduled', {
          status: ExecutionStatus.scheduled,
          lastHeartbeat: stale,
        }),
        conversationExecution('conv-no-heartbeat'),
        {
          executionId: 'standalone',
          executionMode: AgentExecutionMode.standalone,
          status: ExecutionStatus.running,
          agentParams: {},
        } as unknown as AgentExecution,
      ],
    });

    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(
      new Set(['conv-fresh', 'conv-scheduled', 'conv-no-heartbeat'])
    );
  });

  it('counts only agent runs when workflows management is not installed', async () => {
    const { resolver, getWorkflowExecutions } = setup({
      withWorkflows: false,
      executions: [conversationExecution('conv-a')],
    });

    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(
      new Set(['conv-a'])
    );
    expect(getWorkflowExecutions).not.toHaveBeenCalled();
  });

  it('logs a failed lookup and treats it as not in progress', async () => {
    const { resolver, findExecutions, getWorkflowExecutions, logger } = setup({
      workflowExecutions: {},
    });
    findExecutions.mockRejectedValue(new Error('boom'));
    getWorkflowExecutions.mockRejectedValue(new Error('no access'));

    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(new Set());
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('checks one investigation by its exact concurrency key when no agent run holds it', async () => {
    const { resolver, getWorkflowExecutions } = setup({
      workflowExecutions: { 'driver-1': [{ concurrencyGroupKey: 'investigation:conv-b' }] },
    });

    await expect(resolver.isInProgress(request, SPACE_ID, 'conv-b')).resolves.toBe(true);
    expect(getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ concurrencyGroupKey: 'investigation:conv-b', size: 1 }),
      SPACE_ID
    );
  });

  it('skips the workflow lookup when an agent run already holds the investigation', async () => {
    const { resolver, getWorkflowExecutions } = setup({
      executions: [conversationExecution('conv-a')],
    });

    await expect(resolver.isInProgress(request, SPACE_ID, 'conv-a')).resolves.toBe(true);
    expect(getWorkflowExecutions).not.toHaveBeenCalled();
  });
});
