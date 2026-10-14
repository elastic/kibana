/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { MetadataFieldValue } from '@kbn/agent-builder-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { InProgressResolver, type InProgressCandidate } from './in_progress';

const request = httpServerMock.createKibanaRequest();
const SPACE_ID = 'space-1';

const investigation = (
  id: string,
  metadata: Record<string, MetadataFieldValue> = {}
): InProgressCandidate => ({ id, metadata: { status: 'open', ...metadata } });

const setup = ({
  statuses = {},
  pendingProposals = {},
  withProposals = true,
  withWorkflowsManagement = true,
}: {
  /** Status of each readable workflow execution, by id. Any other id reads as not found. */
  statuses?: Record<string, ExecutionStatus>;
  /** Pending proposals per conversation id. */
  pendingProposals?: Record<string, number>;
  withProposals?: boolean;
  withWorkflowsManagement?: boolean;
} = {}) => {
  const getWorkflowExecution = jest.fn(async (id: string) =>
    statuses[id] ? { id, status: statuses[id] } : null
  );
  const countPendingByConversationIds = jest
    .fn()
    .mockResolvedValue(new Map(Object.entries(pendingProposals)));
  const logger = loggerMock.create();
  const resolver = new InProgressResolver({
    getWorkflowsManagement: () =>
      withWorkflowsManagement
        ? ({ getWorkflowExecution } as unknown as WorkflowsServerPluginSetup['management'])
        : undefined,
    getProposals: () =>
      withProposals
        ? ({
            getProposalsService: () => ({ countPendingByConversationIds }),
          } as unknown as ProposalsPluginStart)
        : undefined,
    logger,
  });
  return { resolver, getWorkflowExecution, countPendingByConversationIds, logger };
};

describe('InProgressResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the open investigations with at least one workflow execution not finished', async () => {
    const { resolver } = setup({
      statuses: {
        'exec-running': ExecutionStatus.RUNNING,
        'exec-done': ExecutionStatus.COMPLETED,
        'exec-failed': ExecutionStatus.FAILED,
        'exec-waiting': ExecutionStatus.WAITING_FOR_INPUT,
      },
    });

    const ids = await resolver.findInProgressIds(request, SPACE_ID, [
      investigation('running', { workflow_execution_ids: ['exec-running'] }),
      investigation('done', { workflow_execution_ids: ['exec-done', 'exec-failed'] }),
      investigation('handed-over', { workflow_execution_ids: ['exec-done', 'exec-waiting'] }),
    ]);

    expect(ids).toEqual(new Set(['running', 'handed-over']));
  });

  it('is not in progress when closed, without workflow executions, or with a proposal awaiting a decision', async () => {
    const { resolver, getWorkflowExecution, countPendingByConversationIds } = setup({
      statuses: { 'exec-1': ExecutionStatus.RUNNING },
      pendingProposals: { 'awaiting-decision': 1 },
    });

    const ids = await resolver.findInProgressIds(request, SPACE_ID, [
      investigation('closed', { status: 'closed', workflow_execution_ids: ['exec-1'] }),
      investigation('no-executions'),
      investigation('empty-executions', { workflow_execution_ids: [] }),
      investigation('awaiting-decision', { workflow_execution_ids: ['exec-1'] }),
    ]);

    expect(ids).toEqual(new Set());
    expect(countPendingByConversationIds).toHaveBeenCalledWith(['awaiting-decision'], SPACE_ID);
    expect(getWorkflowExecution).not.toHaveBeenCalled();
  });

  it('reads each workflow execution once, without its step executions', async () => {
    const { resolver, getWorkflowExecution } = setup({
      statuses: { shared: ExecutionStatus.COMPLETED, own: ExecutionStatus.RUNNING },
    });

    const ids = await resolver.findInProgressIds(request, SPACE_ID, [
      investigation('a', { workflow_execution_ids: ['shared'] }),
      investigation('b', { workflow_execution_ids: ['shared', 'own'] }),
    ]);

    expect(ids).toEqual(new Set(['b']));
    expect(getWorkflowExecution).toHaveBeenCalledTimes(2);
    expect(getWorkflowExecution).toHaveBeenCalledWith('shared', SPACE_ID, {
      request,
      omitStepExecutions: true,
    });
  });

  it('counts a workflow execution that cannot be read as finished', async () => {
    const { resolver, getWorkflowExecution, logger } = setup();
    getWorkflowExecution.mockImplementation(async (id: string) => {
      if (id === 'broken') {
        throw new Error('index unavailable');
      }
      return id === 'readable' ? { id, status: ExecutionStatus.RUNNING } : null;
    });

    const ids = await resolver.findInProgressIds(request, SPACE_ID, [
      investigation('missing', { workflow_execution_ids: ['deleted'] }),
      investigation('broken', { workflow_execution_ids: ['broken'] }),
      investigation('running', { workflow_execution_ids: ['broken', 'readable'] }),
    ]);

    expect(ids).toEqual(new Set(['running']));
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('index unavailable'));
  });

  it('reads as not in progress when pending proposals cannot be counted', async () => {
    const { resolver, countPendingByConversationIds, getWorkflowExecution, logger } = setup({
      statuses: { 'exec-1': ExecutionStatus.RUNNING },
    });
    countPendingByConversationIds.mockRejectedValue(new Error('proposals index unavailable'));

    const ids = await resolver.findInProgressIds(request, SPACE_ID, [
      investigation('a', { workflow_execution_ids: ['exec-1'] }),
    ]);

    expect(ids).toEqual(new Set());
    expect(getWorkflowExecution).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not resolve investigations in progress')
    );
  });

  it('skips the pending proposals check without the proposals plugin', async () => {
    const { resolver } = setup({
      statuses: { 'exec-1': ExecutionStatus.RUNNING },
      withProposals: false,
    });

    const ids = await resolver.findInProgressIds(request, SPACE_ID, [
      investigation('a', { workflow_execution_ids: ['exec-1'] }),
    ]);

    expect(ids).toEqual(new Set(['a']));
  });

  it('is never in progress without the workflows management plugin', async () => {
    const { resolver, countPendingByConversationIds } = setup({
      withWorkflowsManagement: false,
    });

    const ids = await resolver.findInProgressIds(request, SPACE_ID, [
      investigation('a', { workflow_execution_ids: ['exec-1'] }),
    ]);

    expect(ids).toEqual(new Set());
    expect(countPendingByConversationIds).not.toHaveBeenCalled();
  });

  it('checks one investigation', async () => {
    const { resolver } = setup({
      statuses: { running: ExecutionStatus.RUNNING, done: ExecutionStatus.COMPLETED },
    });

    await expect(
      resolver.isInProgress(
        request,
        SPACE_ID,
        investigation('a', { workflow_execution_ids: ['running'] })
      )
    ).resolves.toBe(true);
    await expect(
      resolver.isInProgress(
        request,
        SPACE_ID,
        investigation('b', { workflow_execution_ids: ['done'] })
      )
    ).resolves.toBe(false);
  });
});
