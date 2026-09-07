/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ProposalsService } from '../services/proposals_service';
import { getCreateProposalStepDefinition } from './create_proposal_step';
import { getRecordProposalResultStepDefinition } from './record_result_step';

const EXECUTION_ID = 'exec-1';
const SPACE_ID = 'space-a';

const createContext = (input: Record<string, unknown>): StepHandlerContext<never, never> =>
  ({
    input,
    rawInput: input,
    config: {},
    contextManager: {
      getContext: jest.fn().mockReturnValue({
        execution: { id: EXECUTION_ID, executedBy: 'worker-user' },
        workflow: { spaceId: SPACE_ID },
      }),
      getScopedEsClient: jest.fn(),
      getFakeRequest: jest.fn(),
      renderInputTemplate: jest.fn((value) => value),
      callKibanaApi: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'create_proposal',
    stepType: 'proposals.create',
  } as unknown as StepHandlerContext<never, never>);

describe('proposals.create step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should take the workflow execution id from the step context rather than the caller', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'proposal-1',
      status: 'pending',
      category: 'tune',
    });
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
    });

    const result = await definition.handler(
      createContext({
        conversationId: 'conv-1',
        actionWorkflowId: 'system-alertzero-action-create-rule',
        // A caller cannot smuggle in a different execution to resume.
        workflowExecutionId: 'not-my-execution',
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ workflowExecutionId: EXECUTION_ID }),
      { spaceId: SPACE_ID, username: 'worker-user' }
    );
    expect(result.output).toEqual({
      proposalId: 'proposal-1',
      status: 'pending',
      category: 'tune',
      requiresDecision: true,
    });
  });

  it('should report requiresDecision false when the proposal was created already approved', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'proposal-1',
      status: 'approved',
      category: 'tune',
    });
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
    });

    const result = await definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(result.output?.requiresDecision).toBe(false);
  });

  it('should default impact, confidence and origin when the caller omits them', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending', category: 'tune' });
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
    });

    await definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ impact: 'low', confidence: 'medium', origin: 'worker' }),
      expect.anything()
    );
  });

  it('should return an error result rather than throwing when the service fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('index unavailable'));
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
    });

    const result = await definition.handler(createContext({ conversationId: 'conv-1' }));

    expect(result.error?.message).toBe('index unavailable');
    expect(result.output).toBeUndefined();
  });
});

describe('proposals.recordResult step', () => {
  it('should record the outcome against the space from the step context', async () => {
    const recordResult = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'succeeded' });
    const definition = getRecordProposalResultStepDefinition({
      getProposalsService: () => ({ recordResult } as unknown as ProposalsService),
    });

    const result = await definition.handler(
      createContext({ proposalId: 'proposal-1', status: 'succeeded' })
    );

    expect(recordResult).toHaveBeenCalledWith(
      { id: 'proposal-1', status: 'succeeded', executionError: undefined },
      SPACE_ID
    );
    expect(result.output).toEqual({ proposalId: 'proposal-1', status: 'succeeded' });
  });

  it('should pass the failure detail through', async () => {
    const recordResult = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'failed' });
    const definition = getRecordProposalResultStepDefinition({
      getProposalsService: () => ({ recordResult } as unknown as ProposalsService),
    });

    await definition.handler(
      createContext({
        proposalId: 'proposal-1',
        status: 'failed',
        executionError: 'gate timed out',
      })
    );

    expect(recordResult).toHaveBeenCalledWith(
      expect.objectContaining({ executionError: 'gate timed out' }),
      SPACE_ID
    );
  });
});
