/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { createProposalStepInputSchema } from '../../../common/proposals/step_types/create_proposal_step';
import { updateProposalStepInputSchema } from '../../../common/proposals/step_types/update_proposal_step';
import type { ProposalsService } from '../services/proposals_service';
import { getCreateProposalStepDefinition } from './create_proposal_step';
import { getCloneProposalStepDefinition } from './clone_proposal_step';
import { cloneProposalStepInputSchema } from '../../../common/proposals/step_types/clone_proposal_step';
import { getUpdateProposalStepDefinition } from './update_proposal_step';

const EXECUTION_ID = 'exec-1';
const SPACE_ID = 'space-a';
const FAKE_REQUEST = { fake: true } as never;

/**
 * The step gates on the execution's own privileges before touching the
 * service. `hasAllRequested` is the only axis the handler branches on.
 */
const createSecurity = (hasAllRequested: boolean) =>
  ({
    authz: {
      // Mirrors the real serializer: feature API privileges are stored in
      // prefixed form (api_authorization.ts routes requests through
      // actions.api.get). A gate passing the bare string passes unit tests
      // with a naive mock but denies every real API-key caller.
      actions: { api: { get: (privilege: string) => `api:${privilege}` } },
      checkPrivilegesWithRequest: jest.fn().mockReturnValue({
        atSpace: jest.fn().mockResolvedValue({ hasAllRequested }),
      }),
    },
  } as never);

/** The step identifies the Worker from the execution's own fake request. */
const resolvedUser = {
  username: 'worker-user',
  fullName: 'Worker User',
  email: null,
  profileUid: 'worker-uid',
};
const resolveUser = jest.fn().mockResolvedValue(resolvedUser);

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
      getFakeRequest: jest.fn().mockReturnValue(FAKE_REQUEST),
      renderInputTemplate: jest.fn((value) => value),
      callKibanaApi: jest.fn(),
    },
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    abortSignal: new AbortController().signal,
    stepId: 'create_proposal',
    stepType: 'investigations.createProposal',
  } as unknown as StepHandlerContext<never, never>);

describe('investigations.createProposal input schema', () => {
  // Liquid renders a template for an absent workflow input as `''`, so the
  // schema — not just the service — has to treat a blank as an omission.
  it.each(['', null])('should treat %p as absent for the non-string optional inputs', (blank) => {
    const parsed = createProposalStepInputSchema.parse({
      conversationId: 'conv-1',
      comment: 'Tune the noisy rule',
      actionInput: blank,
      expiresIn: blank,
    });

    expect(parsed).toEqual({ conversationId: 'conv-1', comment: 'Tune the noisy rule' });
  });

  it.each(['', null])('should treat %p as absent for the enum inputs', (blank) => {
    const parsed = createProposalStepInputSchema.parse({
      conversationId: 'conv-1',
      comment: 'Tune the noisy rule',
      impact: blank,
      confidence: blank,
      origin: blank,
    });

    expect(parsed).toEqual({ conversationId: 'conv-1', comment: 'Tune the noisy rule' });
  });

  it('should still reject a value the optional input does not allow', () => {
    expect(
      createProposalStepInputSchema.safeParse({
        conversationId: 'conv-1',
        comment: 'Tune the noisy rule',
        impact: 'nope',
      }).success
    ).toBe(false);
  });

  it('should require a comment, since a proposal a human cannot read is not reviewable', () => {
    expect(createProposalStepInputSchema.safeParse({ conversationId: 'conv-1' }).success).toBe(
      false
    );
  });

  it('should still pass real values through', () => {
    const parsed = createProposalStepInputSchema.parse({
      conversationId: 'conv-1',
      comment: 'Tune the noisy rule',
      actionInput: { name: 'Suspicious PowerShell' },
      expiresIn: '24h',
      impact: 'high',
    });

    expect(parsed).toEqual({
      conversationId: 'conv-1',
      comment: 'Tune the noisy rule',
      actionInput: { name: 'Suspicious PowerShell' },
      expiresIn: '24h',
      impact: 'high',
    });
  });

  it('should still convert to a JSON schema the YAML editor can use', () => {
    const jsonSchema = z.toJSONSchema(createProposalStepInputSchema, {
      target: 'draft-7',
      unrepresentable: 'any',
      reused: 'ref',
    }) as { properties: Record<string, unknown>; required?: string[] };

    // Both the step definition hash and the editor schema derive from this.
    expect(Object.keys(jsonSchema.properties)).toEqual(
      Object.keys(createProposalStepInputSchema.shape)
    );
    expect(jsonSchema.required).toEqual(['conversationId', 'comment']);
  });
});

describe('investigations.updateProposal input schema', () => {
  it.each(['', null])('should treat %p as an absent executionError', (blank) => {
    const parsed = updateProposalStepInputSchema.parse({
      proposalId: 'proposal-1',
      status: 'succeeded',
      executionError: blank,
    });

    expect(parsed).toEqual({ proposalId: 'proposal-1', status: 'succeeded' });
  });
});

describe('investigations.createProposal step', () => {
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
      resolveUser,
      getSecurity: () => createSecurity(true),
    });

    const result = await definition.handler(
      createContext({
        conversationId: 'conv-1',
        comment: 'Tune the noisy rule',
        actionWorkflowId: 'system-alertzero-action-create-rule',
        // A caller cannot smuggle in a different execution to resume.
        workflowExecutionId: 'not-my-execution',
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ workflowExecutionId: EXECUTION_ID }),
      { spaceId: SPACE_ID, user: resolvedUser }
    );
    // Identity comes from the execution's credentials, not from `executedBy`.
    expect(resolveUser).toHaveBeenCalledWith(FAKE_REQUEST);
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
      resolveUser,
      getSecurity: () => createSecurity(true),
    });

    const result = await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule' })
    );

    expect(result.output?.requiresDecision).toBe(false);
  });

  it('should default impact, confidence and origin when the caller omits them', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending', category: 'tune' });
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
      resolveUser,
      getSecurity: () => createSecurity(true),
    });

    await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule' })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ impact: 'low', confidence: 'medium', origin: 'worker' }),
      expect.anything()
    );
  });

  it('should return an error result rather than throwing when the service fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('index unavailable'));
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
      resolveUser,
      getSecurity: () => createSecurity(true),
    });

    const result = await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule' })
    );

    expect(result.error?.message).toBe('index unavailable');
    expect(result.output).toBeUndefined();
  });
});

describe('investigations.updateProposal step', () => {
  it('should record the outcome against the space from the step context', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'succeeded' });
    const definition = getUpdateProposalStepDefinition({
      getProposalsService: () => ({ update } as unknown as ProposalsService),
      getSecurity: () => createSecurity(true),
    });

    const result = await definition.handler(
      createContext({ proposalId: 'proposal-1', status: 'succeeded' })
    );

    expect(update).toHaveBeenCalledWith(
      { id: 'proposal-1', status: 'succeeded', executionError: undefined },
      SPACE_ID
    );
    expect(result.output).toEqual({ proposalId: 'proposal-1', status: 'succeeded' });
  });

  it('should pass the failure detail through', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'failed' });
    const definition = getUpdateProposalStepDefinition({
      getProposalsService: () => ({ update } as unknown as ProposalsService),
      getSecurity: () => createSecurity(true),
    });

    await definition.handler(
      createContext({
        proposalId: 'proposal-1',
        status: 'failed',
        executionError: 'gate timed out',
      })
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ executionError: 'gate timed out' }),
      SPACE_ID
    );
  });
});

describe('investigations.createProposal privilege gate', () => {
  it('should deny before calling the service when the execution lacks manage_proposals', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending' });
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
      resolveUser,
      getSecurity: () => createSecurity(false),
    });

    const result = await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule' })
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.error?.message).toMatch(/lacks/);
  });

  it('should fail closed when the privilege check itself errors', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending' });
    const security = {
      authz: {
        checkPrivilegesWithRequest: jest.fn().mockReturnValue({
          atSpace: jest.fn().mockRejectedValue(new Error('es unreachable')),
        }),
      },
    } as never;
    const definition = getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
      resolveUser,
      getSecurity: () => security,
    });

    const result = await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule' })
    );

    expect(create).not.toHaveBeenCalled();
    expect(result.error?.message).toMatch(/Privilege check failed/);
  });
});

describe('investigations.updateProposal privilege gate', () => {
  it('should deny before calling the service when the execution lacks manage_proposals', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'p', status: 'succeeded' });
    const definition = getUpdateProposalStepDefinition({
      getProposalsService: () => ({ update } as unknown as ProposalsService),
      getSecurity: () => createSecurity(false),
    });

    const result = await definition.handler(
      createContext({ proposalId: 'proposal-1', status: 'succeeded' })
    );

    expect(update).not.toHaveBeenCalled();
    expect(result.error?.message).toMatch(/lacks/);
  });

  describe('investigations.cloneProposal step', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should clone from the step context execution, not from any caller-supplied id', async () => {
      const clone = jest.fn().mockResolvedValue({ id: 'proposal-2', status: 'pending' });
      const definition = getCloneProposalStepDefinition({
        getProposalsService: () => ({ clone } as unknown as ProposalsService),
        getSecurity: () => createSecurity(true),
      });

      const result = await definition.handler(createContext({ proposalId: 'proposal-1' }));

      expect(clone).toHaveBeenCalledWith({ proposalId: 'proposal-1' }, SPACE_ID, {
        workflowExecutionId: EXECUTION_ID,
      });
      expect(result.output).toEqual({
        proposalId: 'proposal-2',
        status: 'pending',
        requiresDecision: true,
      });
    });

    it('should apply optional caller overrides', async () => {
      const clone = jest.fn().mockResolvedValue({ id: 'proposal-2', status: 'pending' });
      const definition = getCloneProposalStepDefinition({
        getProposalsService: () => ({ clone } as unknown as ProposalsService),
        getSecurity: () => createSecurity(true),
      });

      await definition.handler(
        createContext({
          proposalId: 'proposal-1',
          overrides: { comment: 'Retried with retuned input' },
        })
      );

      expect(clone).toHaveBeenCalledWith(
        expect.objectContaining({ overrides: { comment: 'Retried with retuned input' } }),
        SPACE_ID,
        expect.anything()
      );
    });

    it('should deny before calling the service when the execution lacks manage_proposals', async () => {
      const clone = jest.fn().mockResolvedValue({ id: 'p2', status: 'pending' });
      const definition = getCloneProposalStepDefinition({
        getProposalsService: () => ({ clone } as unknown as ProposalsService),
        getSecurity: () => createSecurity(false),
      });

      const result = await definition.handler(createContext({ proposalId: 'proposal-1' }));

      expect(clone).not.toHaveBeenCalled();
      expect(result.error?.message).toMatch(/lacks/);
    });

    it('should fail closed when the privilege check itself errors', async () => {
      const clone = jest.fn().mockResolvedValue({ id: 'p2', status: 'pending' });
      const security = {
        authz: {
          checkPrivilegesWithRequest: jest.fn().mockReturnValue({
            atSpace: jest.fn().mockRejectedValue(new Error('es unreachable')),
          }),
        },
      } as never;
      const definition = getCloneProposalStepDefinition({
        getProposalsService: () => ({ clone } as unknown as ProposalsService),
        getSecurity: () => security,
      });

      const result = await definition.handler(createContext({ proposalId: 'proposal-1' }));

      expect(clone).not.toHaveBeenCalled();
      expect(result.error?.message).toMatch(/Privilege check failed/);
    });

    it('should return an error result rather than throwing when the service refuses the clone', async () => {
      const clone = jest
        .fn()
        .mockRejectedValue(new Error('only a failed proposal can be recovered'));
      const definition = getCloneProposalStepDefinition({
        getProposalsService: () => ({ clone } as unknown as ProposalsService),
        getSecurity: () => createSecurity(true),
      });

      const result = await definition.handler(createContext({ proposalId: 'proposal-1' }));

      expect(result.error?.message).toMatch(/only a failed proposal/);
      expect(result.output).toBeUndefined();
    });
  });

  describe('investigations.cloneProposal input schema', () => {
    it("should treat a blank optional input as absent, since liquid renders omissions as ''", () => {
      const parsed = cloneProposalStepInputSchema.parse({ proposalId: 'proposal-1', comment: '' });
      expect(parsed).toEqual({ proposalId: 'proposal-1' });
    });

    it('should require proposalId', () => {
      expect(cloneProposalStepInputSchema.safeParse({ comment: 'x' }).success).toBe(false);
    });
  });
});
