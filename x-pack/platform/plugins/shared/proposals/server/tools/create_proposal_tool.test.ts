/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext, ToolHandlerStandardReturn } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import { PROPOSALS_CREATE_TOOL_ID } from '@kbn/proposals-common';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { ProposalForbiddenError } from '../services/errors';
import type { ProposalsService } from '../services/proposals_service';
import {
  createProposalTool,
  PROPOSAL_PENDING_NOTE,
  type CreateProposalToolParams,
} from './create_proposal_tool';

const SPACE_ID = 'default';
const CONVERSATION_ID = 'conv-1';
const EXECUTION_ID = 'exec-1';

const params: CreateProposalToolParams = {
  title: 'Roll back checkout to v1.2.3',
  comment: 'Run `kubectl rollout undo deployment/checkout`.',
  origin: 'nightshift',
  impact: 'medium',
};

const proposal = { id: 'proposal-1', title: params.title, status: 'pending' };

const setup = ({
  assertCanManage = jest.fn().mockResolvedValue(undefined),
  stack = [{ type: 'agent', agentId: 'nightshift', conversationId: CONVERSATION_ID }],
  findByWorkflowExecutionId = jest.fn().mockResolvedValue(proposal),
  isWorkflowsAvailable = true,
}: {
  assertCanManage?: jest.Mock;
  stack?: object[];
  findByWorkflowExecutionId?: jest.Mock;
  isWorkflowsAvailable?: boolean;
} = {}) => {
  const service = { findByWorkflowExecutionId };
  const workflowsApi = {
    isWorkflowsAvailable,
    executeWorkflow: jest.fn().mockResolvedValue({ workflowExecutionId: EXECUTION_ID }),
    assertWorkflowAccess: jest.fn().mockResolvedValue(undefined),
  };
  const privileges: ProposalPrivilegesChecker = {
    assertCanManage,
    assertCanRead: jest.fn(),
    canManage: jest.fn(),
  };
  const request = httpServerMock.createKibanaRequest();
  const tool = createProposalTool({
    getProposalsService: () => service as unknown as ProposalsService,
    getWorkflowsApi: () => workflowsApi as unknown as WorkflowsServerPluginSetup['management'],
    privileges,
    logger: loggerMock.create(),
    wait: { timeoutMs: 20, intervalMs: 1 },
  });
  const context = {
    request,
    spaceId: SPACE_ID,
    runContext: { runId: 'run-1', stack },
  } as unknown as ToolHandlerContext;

  const call = async (input: CreateProposalToolParams = params) => {
    const { results } = (await tool.handler(input, context)) as ToolHandlerStandardReturn;
    return results[0];
  };

  return { service, workflowsApi, tool, call, request };
};

describe('proposals.create', () => {
  it('is the allow-listed builtin tool id', () => {
    expect(setup().tool.id).toBe(PROPOSALS_CREATE_TOOL_ID);
  });

  it('starts the gate workflow as the caller for an action-less proposal', async () => {
    const { workflowsApi, call, request } = setup();

    await call();

    expect(workflowsApi.executeWorkflow).toHaveBeenCalledWith({
      workflowId: CREATE_PROPOSAL_WORKFLOW_ID,
      spaceId: SPACE_ID,
      request,
      inputs: {
        conversationId: CONVERSATION_ID,
        title: params.title,
        comment: params.comment,
        origin: 'nightshift',
        impact: 'medium',
      },
      waitForCompletion: false,
    });
  });

  it('returns the proposal the gate created', async () => {
    const { service, call } = setup();

    const result = await call();

    expect(service.findByWorkflowExecutionId).toHaveBeenCalledWith(EXECUTION_ID, SPACE_ID);
    expect(result).toMatchObject({
      type: ToolResultType.other,
      data: {
        acknowledged: true,
        proposal_id: 'proposal-1',
        title: params.title,
        status: 'pending',
        workflow_execution_id: EXECUTION_ID,
      },
    });
  });

  it('waits for the create step, then acknowledges without an id', async () => {
    const findByWorkflowExecutionId = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(proposal);
    const { call } = setup({ findByWorkflowExecutionId });
    await expect(call()).resolves.toMatchObject({ data: { proposal_id: 'proposal-1' } });

    const { call: callSlow } = setup({
      findByWorkflowExecutionId: jest.fn().mockResolvedValue(undefined),
    });
    const result = await callSlow();
    expect(result.data).toEqual({
      acknowledged: true,
      workflow_execution_id: EXECUTION_ID,
      note: PROPOSAL_PENDING_NOTE,
    });
  });

  it('refuses to create without the manage proposals privilege', async () => {
    const { workflowsApi, call } = setup({
      assertCanManage: jest.fn().mockRejectedValue(new ProposalForbiddenError('Missing privilege')),
    });

    const result = await call();

    expect(result.type).toBe(ToolResultType.error);
    expect(workflowsApi.executeWorkflow).not.toHaveBeenCalled();
  });

  it('refuses to run outside a conversation', async () => {
    const { workflowsApi, call } = setup({ stack: [{ type: 'agent', agentId: 'nightshift' }] });

    const result = await call();

    expect(result.type).toBe(ToolResultType.error);
    expect(workflowsApi.executeWorkflow).not.toHaveBeenCalled();
  });

  it('is unavailable without execute access to the gate workflow', async () => {
    const { tool, request, workflowsApi } = setup();
    workflowsApi.assertWorkflowAccess.mockRejectedValue(new Error('Forbidden'));

    await expect(
      tool.availability?.handler({ request, spaceId: SPACE_ID } as never)
    ).resolves.toMatchObject({ status: 'unavailable', reason: 'Forbidden' });
    expect(workflowsApi.assertWorkflowAccess).toHaveBeenCalledWith(
      CREATE_PROPOSAL_WORKFLOW_ID,
      SPACE_ID,
      'execute',
      request
    );
  });

  it('is unavailable without the privilege or without workflows', async () => {
    const denied = setup({
      assertCanManage: jest.fn().mockRejectedValue(new ProposalForbiddenError('Missing privilege')),
    });
    await expect(
      denied.tool.availability?.handler({ request: denied.request, spaceId: SPACE_ID } as never)
    ).resolves.toMatchObject({ status: 'unavailable' });

    const noWorkflows = setup({ isWorkflowsAvailable: false });
    await expect(
      noWorkflows.tool.availability?.handler({
        request: noWorkflows.request,
        spaceId: SPACE_ID,
      } as never)
    ).resolves.toMatchObject({ status: 'unavailable' });

    const allowed = setup();
    await expect(
      allowed.tool.availability?.handler({ request: allowed.request, spaceId: SPACE_ID } as never)
    ).resolves.toEqual({ status: 'available' });
  });

  it('bounds the input like the create route', () => {
    const { tool } = setup();

    expect(tool.schema.safeParse({ ...params, comment: 'x'.repeat(8193) }).success).toBe(false);
    expect(tool.schema.safeParse({ ...params, origin: 'unknown' }).success).toBe(false);
    expect(tool.schema.safeParse({ ...params, title: '' }).success).toBe(false);
  });
});
