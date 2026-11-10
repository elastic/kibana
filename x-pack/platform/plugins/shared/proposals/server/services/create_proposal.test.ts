/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { CREATE_PROPOSAL_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createProposalCreator } from './create_proposal';

const request = httpServerMock.createKibanaRequest();
const proposal = { id: 'proposal-1', title: 'Restore the secrets', status: 'pending' };

const setup = ({
  isWorkflowsAvailable = true,
  assertCanManage = jest.fn().mockResolvedValue(undefined),
  findByWorkflowExecutionId = jest.fn().mockResolvedValue(proposal),
} = {}) => {
  const executeWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-1' });
  const createDirectly = jest.fn().mockResolvedValue(proposal);
  const { create, assertAvailable } = createProposalCreator({
    getProposalsService: () => ({ findByWorkflowExecutionId, create: createDirectly } as never),
    getWorkflowsApi: () => ({ isWorkflowsAvailable, executeWorkflow } as never),
    privileges: { assertCanManage } as never,
    wait: { timeoutMs: 20, intervalMs: 5 },
  });
  return {
    create,
    assertAvailable,
    executeWorkflow,
    assertCanManage,
    findByWorkflowExecutionId,
    createDirectly,
  };
};

const input = {
  request,
  spaceId: 'default',
  conversationId: 'conv-1',
  proposal: {
    title: 'Restore the secrets',
    comment: 'Re-create them.',
    origin: 'nightshift' as const,
  },
};

describe('createProposalCreator', () => {
  it('starts the gate workflow for the conversation and returns the stored proposal', async () => {
    const { create, executeWorkflow } = setup();

    await expect(create(input)).resolves.toEqual({ workflowExecutionId: 'exec-1', proposal });

    expect(executeWorkflow).toHaveBeenCalledWith({
      workflowId: CREATE_PROPOSAL_WORKFLOW_ID,
      spaceId: 'default',
      request,
      inputs: {
        conversationId: 'conv-1',
        title: 'Restore the secrets',
        comment: 'Re-create them.',
        origin: 'nightshift',
      },
      waitForCompletion: false,
    });
  });

  it('passes the optional fields it was given, and only those', async () => {
    const { create, executeWorkflow } = setup();

    await create({
      ...input,
      proposal: { ...input.proposal, impact: 'high', confidence: 'low', category: 'tune' },
    });

    expect(executeWorkflow.mock.calls[0][0].inputs).toMatchObject({
      impact: 'high',
      confidence: 'low',
      category: 'tune',
    });
  });

  it('writes a to-do directly, with no gate behind it', async () => {
    const { create, executeWorkflow, createDirectly, assertCanManage } = setup();

    await expect(
      create({ ...input, proposal: { ...input.proposal, category: 'todo', impact: 'high' } })
    ).resolves.toEqual({ proposal });

    // Nothing parks on a to-do, and the answer carries no execution to poll.
    expect(executeWorkflow).not.toHaveBeenCalled();
    expect(assertCanManage).toHaveBeenCalledWith(request);
    expect(createDirectly).toHaveBeenCalledWith(
      {
        gate: 'none',
        conversationId: 'conv-1',
        title: 'Restore the secrets',
        comment: 'Re-create them.',
        origin: 'nightshift',
        category: 'todo',
        impact: 'high',
        confidence: 'medium',
      },
      { spaceId: 'default', request }
    );
  });

  it('drops an impact or confidence it does not recognize', async () => {
    const { create, createDirectly } = setup();

    await create({
      ...input,
      proposal: { ...input.proposal, category: 'todo', impact: 'enormous', confidence: '' },
    });

    const [params] = createDirectly.mock.calls[0];
    expect(params.impact).toBeUndefined();
    expect(params.confidence).toBe('medium');
  });

  it('creates a to-do for a user without Workflows available', async () => {
    const { create, createDirectly } = setup({ isWorkflowsAvailable: false });

    await create({ ...input, proposal: { ...input.proposal, category: 'todo' } });

    expect(createDirectly).toHaveBeenCalled();
  });

  it('returns the execution without a proposal when it is not stored in time', async () => {
    const { create } = setup({ findByWorkflowExecutionId: jest.fn().mockResolvedValue(undefined) });

    await expect(create(input)).resolves.toEqual({
      workflowExecutionId: 'exec-1',
      proposal: undefined,
    });
  });

  it('does not start anything when workflows are unavailable', async () => {
    const { create, executeWorkflow } = setup({ isWorkflowsAvailable: false });

    await expect(create(input)).rejects.toThrow('Workflows are not available');
    expect(executeWorkflow).not.toHaveBeenCalled();
  });

  it('does not start anything for a user without the proposal privilege', async () => {
    const { create, executeWorkflow } = setup({
      assertCanManage: jest.fn().mockRejectedValue(new Error('Forbidden')),
    });

    await expect(create(input)).rejects.toThrow('Forbidden');
    expect(executeWorkflow).not.toHaveBeenCalled();
  });
});
