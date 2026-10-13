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

const setup = ({ executions = [] }: { executions?: AgentExecution[] } = {}) => {
  const findExecutions = jest.fn().mockResolvedValue(executions);
  const logger = loggerMock.create();
  const resolver = new InProgressResolver({
    getAgentExecutions: () => ({ findExecutions } as unknown as ExecutionStart),
    logger,
    now: () => NOW,
  });
  return { resolver, findExecutions, logger };
};

describe('InProgressResolver', () => {
  it('returns the conversations of scheduled and running agent executions', async () => {
    const { resolver, findExecutions } = setup({
      executions: [conversationExecution('conv-a'), conversationExecution('conv-b')],
    });

    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(
      new Set(['conv-a', 'conv-b'])
    );
    expect(findExecutions).toHaveBeenCalledWith(request, {
      spaceId: SPACE_ID,
      filter: { status: [ExecutionStatus.scheduled, ExecutionStatus.running] },
      size: 1000,
    });
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

  it('judges a running execution without a heartbeat by its creation time', async () => {
    const { resolver } = setup({
      executions: [
        conversationExecution('conv-old', {
          '@timestamp': new Date(NOW - STALE_AGENT_HEARTBEAT_MS - 1).toISOString(),
        }),
        conversationExecution('conv-new', { '@timestamp': new Date(NOW - 1000).toISOString() }),
      ],
    });

    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(
      new Set(['conv-new'])
    );
  });

  it('checks one investigation against the running executions', async () => {
    const { resolver } = setup({ executions: [conversationExecution('conv-a')] });

    await expect(resolver.isInProgress(request, SPACE_ID, 'conv-a')).resolves.toBe(true);
    await expect(resolver.isInProgress(request, SPACE_ID, 'conv-b')).resolves.toBe(false);
  });

  it('reads as not in progress while the execution index has no available shard', async () => {
    const { resolver, findExecutions, logger } = setup();
    findExecutions.mockRejectedValue(
      Object.assign(new Error('all shards failed'), {
        statusCode: 503,
        body: {
          error: {
            type: 'search_phase_execution_exception',
            root_cause: [{ type: 'no_shard_available_action_exception' }],
          },
        },
      })
    );

    await expect(resolver.isInProgress(request, SPACE_ID, 'conv-a')).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not read agent executions')
    );
  });

  it('reads as not in progress when the agent execution service itself throws', async () => {
    const logger = loggerMock.create();
    const resolver = new InProgressResolver({
      getAgentExecutions: () => {
        throw new Error('execution service unavailable');
      },
      logger,
    });

    await expect(resolver.isInProgress(request, SPACE_ID, 'conv-a')).resolves.toBe(false);
    await expect(resolver.findInProgressIds(request, SPACE_ID)).resolves.toEqual(new Set());
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
