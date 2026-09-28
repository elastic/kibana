/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { z } from '@kbn/zod/v4';
import { createProposalStepInputSchema } from '@kbn/proposals-common';
import { updateProposalStepInputSchema } from '@kbn/proposals-common';
import type { ProposalsService } from '../services/proposals_service';
import type { ProposalPrivilegesChecker } from '../services/check_proposal_privileges';
import { ProposalForbiddenError } from '../services/errors';
import { getCheckDecidePrivilegesStepDefinition } from './check_decide_privileges_step';
import { getCloneProposalStepDefinition } from './clone_proposal_step';
import { getCreateProposalStepDefinition } from './create_proposal_step';
import { getGetProposalStepDefinition } from './get_proposal_step';
import { getUpdateProposalStepDefinition } from './update_proposal_step';

const EXECUTION_ID = 'exec-1';
const SPACE_ID = 'space-a';
const FAKE_REQUEST = { fake: true } as never;

/** The step identifies the actor from the execution's own fake request. */
const resolvedUser = {
  username: 'worker-user',
  fullName: 'Worker User',
  email: null,
  profileUid: 'worker-uid',
};
const resolveUser = jest.fn().mockResolvedValue(resolvedUser);

/** Allows everything by default; a test overrides the one call it exercises. */
const allowAll = (): jest.Mocked<ProposalPrivilegesChecker> => ({
  assertCanManage: jest.fn().mockResolvedValue(undefined),
  assertCanRead: jest.fn().mockResolvedValue(undefined),
  canManage: jest.fn().mockResolvedValue(true),
});

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
    stepType: 'proposals.createProposal',
  } as unknown as StepHandlerContext<never, never>);

describe('proposals.createProposal input schema', () => {
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

describe('proposals.updateProposal input schema', () => {
  it.each(['', null])('should treat %p as absent across every optional input', (blank) => {
    const parsed = updateProposalStepInputSchema.parse({
      proposalId: 'proposal-1',
      status: blank,
      decision: blank,
      decidedBy: blank,
      dismissReason: blank,
      rationale: blank,
      executionError: blank,
    });

    // Every field is optional, so a call that only annotates is valid.
    expect(parsed).toEqual({ proposalId: 'proposal-1' });
  });

  it('should accept a decision and a status in the same call', () => {
    // `approved` + `pending` is not a legal pair, so the workflow always
    // writes the decision together with the status it implies.
    const parsed = updateProposalStepInputSchema.parse({
      proposalId: 'proposal-1',
      decision: 'approved',
      status: 'executing',
      decidedBy: 'analyst',
    });

    expect(parsed).toEqual({
      proposalId: 'proposal-1',
      decision: 'approved',
      status: 'executing',
      decidedBy: 'analyst',
    });
  });

  it('should refuse to move a proposal back to awaiting', () => {
    expect(
      updateProposalStepInputSchema.safeParse({ proposalId: 'proposal-1', status: 'pending' })
        .success
    ).toBe(false);
  });

  it('should refuse a decision outside the vocabulary', () => {
    expect(
      updateProposalStepInputSchema.safeParse({ proposalId: 'proposal-1', decision: 'maybe' })
        .success
    ).toBe(false);
  });
});

describe('proposals.createProposal step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDefinition = (create: jest.Mock, privileges = allowAll()) => ({
    definition: getCreateProposalStepDefinition({
      getProposalsService: () => ({ create } as unknown as ProposalsService),
      resolveUser,
      privileges,
    }),
    privileges,
  });

  it('should take the workflow execution id from the step context rather than the caller', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'proposal-1',
      status: 'pending',
      category: 'tune',
      action: { name: 'Create rule' },
      expiresAt: '2026-09-04T00:00:00.000Z',
    });
    const { definition } = createDefinition(create);

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
      { spaceId: SPACE_ID, user: resolvedUser, request: FAKE_REQUEST }
    );
    // Identity comes from the execution's credentials, not from `executedBy`.
    expect(resolveUser).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(result.output).toEqual({
      proposalId: 'proposal-1',
      rootProposalId: 'proposal-1',
      status: 'pending',
      category: 'tune',
      alwaysGate: false,
      expiresAt: '2026-09-04T00:00:00.000Z',
    });
  });

  it('should report alwaysGate when the action refuses to be auto-approved', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'p',
      status: 'pending',
      action: { name: 'Isolate host', approvalPolicy: 'always-gate' },
    });
    const { definition } = createDefinition(create);

    const result = await definition.handler(
      createContext({
        conversationId: 'conv-1',
        comment: 'Isolate the host',
        actionWorkflowId: 'system-alertzero-action-isolate-host',
      })
    );

    expect(result.output?.alwaysGate).toBe(true);
  });

  it.each([
    ['autonomy-dependent', { name: 'Create rule', approvalPolicy: 'autonomy-dependent' }],
    ['no declared policy', { name: 'Create rule' }],
  ])('should leave alwaysGate false for an action with %s', async (_label, action) => {
    // Only `always-gate` overrides the caller; a resolved action that declares
    // anything else leaves the decision to the autonomy already resolved.
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending', action });
    const { definition } = createDefinition(create);

    const result = await definition.handler(
      createContext({
        conversationId: 'conv-1',
        comment: 'Tune the noisy rule',
        actionWorkflowId: 'system-alertzero-action-create-rule',
      })
    );

    expect(result.output?.alwaysGate).toBe(false);
  });

  it('should fail closed on alwaysGate when the action metadata did not resolve', async () => {
    // `create` swallows a workflow read failure and invalid `actionMetadata`
    // alike, so both reach the handler as no metadata at all. Reading that as
    // "no always-gate policy" would run an action whose author forbade it on
    // nothing more than a transient lookup error.
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending', action: undefined });
    const { definition } = createDefinition(create);

    const result = await definition.handler(
      createContext({
        conversationId: 'conv-1',
        comment: 'Tune the noisy rule',
        actionWorkflowId: 'system-alertzero-action-create-rule',
      })
    );

    expect(result.output?.alwaysGate).toBe(true);
  });

  it('should pass a blank optional input to the service as an omission', async () => {
    // The engine renders a step's `with` block and hands it over unparsed —
    // `CustomStepImpl.getInput()` never applies `inputSchema` — so the `''`
    // Liquid renders for an absent input arrives verbatim. The handler parses
    // the input itself, which is the only thing that makes `optionalStepInput`
    // take effect; without it the service stores empty strings where a
    // category, an impact and a confidence should be.
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending' });
    const { definition } = createDefinition(create);

    await definition.handler(
      createContext({
        conversationId: 'conv-1',
        comment: 'Tune the noisy rule',
        actionWorkflowId: '',
        impact: '',
        category: '',
        confidence: '',
      })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        actionWorkflowId: undefined,
        impact: undefined,
        category: undefined,
        // The handler's own default, which `''` would have satisfied.
        confidence: 'medium',
      }),
      expect.anything()
    );
  });

  it('should emit expiresAt so the gate loop can derive each attempt from it', async () => {
    const create = jest
      .fn()
      .mockResolvedValue({ id: 'p', status: 'pending', expiresAt: '2026-09-04T00:00:00.000Z' });
    const { definition } = createDefinition(create);

    const result = await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule' })
    );

    expect(result.output?.expiresAt).toBe('2026-09-04T00:00:00.000Z');
  });

  it('should pass the caller impact straight through for the service to prefer', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending' });
    const { definition } = createDefinition(create);

    await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule', impact: 'high' })
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ impact: 'high', confidence: 'medium', origin: 'worker' }),
      expect.anything()
    );
  });

  it('should leave impact undefined when the caller omits it', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'p', status: 'pending' });
    const { definition } = createDefinition(create);

    await definition.handler(
      createContext({ conversationId: 'conv-1', comment: 'Tune the noisy rule' })
    );

    // The service resolves the fallback chain; the step must not pre-empt it
    // with a default, or the action's own impact could never win.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ impact: undefined }),
      expect.anything()
    );
  });

  it('should assert manage before writing anything', async () => {
    const create = jest.fn();
    const privileges = allowAll();
    privileges.assertCanManage.mockRejectedValue(new ProposalForbiddenError('nope'));
    const { definition } = createDefinition(create, privileges);

    await expect(
      definition.handler(createContext({ conversationId: 'conv-1', comment: 'Tune' }))
    ).rejects.toMatchObject({ type: 'PermissionError' });
    expect(create).not.toHaveBeenCalled();
  });

  it('should fail the step with a typed error when the service fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('index unavailable'));
    const { definition } = createDefinition(create);

    // A distinct type is the only thing a workflow can branch on, since
    // ExecutionError carries nothing else to tell failures apart.
    await expect(
      definition.handler(createContext({ conversationId: 'conv-1', comment: 'Tune' }))
    ).rejects.toMatchObject({ type: 'ApiError', message: 'index unavailable' });
  });
});

describe('proposals.updateProposal step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const updateDefinition = (update: jest.Mock, privileges = allowAll()) =>
    getUpdateProposalStepDefinition({
      getProposalsService: () => ({ update } as unknown as ProposalsService),
      resolveUser,
      privileges,
    });

  it('should record the outcome against the space from the step context', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'succeeded' });

    const result = await updateDefinition(update).handler(
      createContext({ proposalId: 'proposal-1', status: 'succeeded' })
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'proposal-1', status: 'succeeded' }),
      SPACE_ID
    );
    expect(result.output).toEqual({
      proposalId: 'proposal-1',
      status: 'succeeded',
      decision: undefined,
    });
  });

  it('should resolve the decider from the execution request, not the passed username', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'proposal-1', status: 'executing', decision: 'approved' });

    await updateDefinition(update).handler(
      createContext({
        proposalId: 'proposal-1',
        decision: 'approved',
        status: 'executing',
        decidedBy: 'someone-else',
      })
    );

    // Post-gate the execution runs as the approver, so the request is the
    // better attribution.
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ decidedBy: resolvedUser }),
      SPACE_ID
    );
  });

  it('should fall back to the gate username when the request yields no identity', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'proposal-1', status: 'no_action', decision: 'dismissed' });
    resolveUser.mockResolvedValueOnce(undefined);

    await updateDefinition(update).handler(
      createContext({
        proposalId: 'proposal-1',
        decision: 'dismissed',
        status: 'no_action',
        decidedBy: 'analyst',
      })
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        decidedBy: { username: 'analyst', fullName: null, email: null },
      }),
      SPACE_ID
    );
  });

  it('should leave the decider unset when only the status moves', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'succeeded' });

    await updateDefinition(update).handler(
      createContext({ proposalId: 'proposal-1', status: 'succeeded' })
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ decidedBy: undefined }),
      SPACE_ID
    );
    expect(resolveUser).not.toHaveBeenCalled();
  });

  it('should return the decision so the workflow can read back what it wrote', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'proposal-1', status: 'no_action', decision: 'dismissed' });

    const result = await updateDefinition(update).handler(
      createContext({ proposalId: 'proposal-1', decision: 'dismissed', status: 'no_action' })
    );

    expect(result.output?.decision).toBe('dismissed');
  });

  it('should pass the failure detail through', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'failed' });

    await updateDefinition(update).handler(
      createContext({
        proposalId: 'proposal-1',
        status: 'failed',
        executionError: 'action exploded',
      })
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ executionError: 'action exploded' }),
      SPACE_ID
    );
  });

  it('should assert manage before writing', async () => {
    const update = jest.fn();
    const privileges = allowAll();
    privileges.assertCanManage.mockRejectedValue(new ProposalForbiddenError('nope'));

    await expect(
      updateDefinition(update, privileges).handler(
        createContext({ proposalId: 'proposal-1', status: 'succeeded' })
      )
    ).rejects.toMatchObject({ type: 'PermissionError' });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('proposals.checkDecidePrivileges step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report a refusal without failing the step', async () => {
    const privileges = allowAll();
    privileges.canManage.mockResolvedValue(false);
    const definition = getCheckDecidePrivilegesStepDefinition({ privileges });

    // Failing here would spend the gate and strand the proposal, leaving no
    // way for a privileged approver to retry.
    const result = await definition.handler(createContext({ proposalId: 'proposal-1' }));

    expect(result.output).toEqual({ canDecide: false });
    expect(privileges.canManage).toHaveBeenCalledWith(FAKE_REQUEST);
  });

  it('should report an allowance', async () => {
    const definition = getCheckDecidePrivilegesStepDefinition({ privileges: allowAll() });

    const result = await definition.handler(createContext({ proposalId: 'proposal-1' }));

    expect(result.output).toEqual({ canDecide: true });
  });

  it('should fail the step when the privilege check itself errors', async () => {
    const privileges = allowAll();
    privileges.canManage.mockRejectedValue(new Error('privilege service unavailable'));
    const definition = getCheckDecidePrivilegesStepDefinition({ privileges });

    // A service fault must stay distinguishable from a refusal, or the loop
    // would re-park forever on an outage.
    await expect(
      definition.handler(createContext({ proposalId: 'proposal-1' }))
    ).rejects.toMatchObject({ type: 'ApiError' });
  });

  it('should refuse an external resume without consulting the privilege service', async () => {
    const privileges = allowAll();
    const definition = getCheckDecidePrivilegesStepDefinition({ privileges });

    // An external resume carries no request, so the execution wakes under the
    // workflow runner's key — which always holds `manage_proposals`, having
    // created the proposal. Checking it would authorize every external click
    // as the Worker.
    const result = await definition.handler(
      createContext({ proposalId: 'proposal-1', respondedBy: 'external_resume:step-exec-1' })
    );

    expect(result.output).toEqual({ canDecide: false });
    expect(privileges.canManage).not.toHaveBeenCalled();
  });

  it('should still check a named responder normally', async () => {
    const privileges = allowAll();
    const definition = getCheckDecidePrivilegesStepDefinition({ privileges });

    const result = await definition.handler(
      createContext({ proposalId: 'proposal-1', respondedBy: 'analyst' })
    );

    expect(result.output).toEqual({ canDecide: true });
    expect(privileges.canManage).toHaveBeenCalledWith(FAKE_REQUEST);
  });
});

describe('proposals.getProposal step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getDefinition = (get: jest.Mock, privileges = allowAll()) =>
    getGetProposalStepDefinition({
      getProposalsService: () => ({ get } as unknown as ProposalsService),
      privileges,
    });

  it('should return only the fields a gating workflow branches on', async () => {
    const get = jest.fn().mockResolvedValue({
      id: 'proposal-1',
      status: 'failed',
      decision: 'approved',
      decidedBy: {
        username: 'analyst',
        fullName: 'Alice Analyst',
        email: null,
        profileUid: 'uid-1',
      },
      supersededBy: 'proposal-2',
      expiresAt: '2026-09-04T00:00:00.000Z',
      actionWorkflowId: 'system-alertzero-action-create-rule',
      comment: 'not part of the contract',
    });

    const result = await getDefinition(get).handler(createContext({ proposalId: 'proposal-1' }));

    expect(get).toHaveBeenCalledWith('proposal-1', SPACE_ID, FAKE_REQUEST);
    expect(result.output).toEqual({
      status: 'failed',
      decision: 'approved',
      decidedBy: {
        username: 'analyst',
        fullName: 'Alice Analyst',
        email: null,
        profileUid: 'uid-1',
      },
      supersededBy: 'proposal-2',
      expiresAt: '2026-09-04T00:00:00.000Z',
      actionWorkflowId: 'system-alertzero-action-create-rule',
    });
  });

  it('should leave decidedBy undefined when the stored proposal has no decider', async () => {
    const get = jest.fn().mockResolvedValue({ status: 'pending' });

    const result = await getDefinition(get).handler(createContext({ proposalId: 'proposal-1' }));

    expect(result.output?.decidedBy).toBeUndefined();
  });

  it('should assert read rather than manage', async () => {
    const get = jest.fn().mockResolvedValue({ status: 'pending' });
    const privileges = allowAll();

    await getDefinition(get, privileges).handler(createContext({ proposalId: 'proposal-1' }));

    expect(privileges.assertCanRead).toHaveBeenCalledWith(FAKE_REQUEST);
    expect(privileges.assertCanManage).not.toHaveBeenCalled();
  });

  it('should fail the step when the reader lacks the privilege', async () => {
    const get = jest.fn();
    const privileges = allowAll();
    privileges.assertCanRead.mockRejectedValue(new ProposalForbiddenError('nope'));

    await expect(
      getDefinition(get, privileges).handler(createContext({ proposalId: 'proposal-1' }))
    ).rejects.toMatchObject({ type: 'PermissionError' });
    expect(get).not.toHaveBeenCalled();
  });
});

describe('proposals.cloneProposal step', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const cloneDefinition = (clone: jest.Mock, privileges = allowAll()) =>
    getCloneProposalStepDefinition({
      getProposalsService: () => ({ clone } as unknown as ProposalsService),
      privileges,
    });

  it('should return the new proposal id and pass the failure detail on', async () => {
    const clone = jest.fn().mockResolvedValue('proposal-2');

    const result = await cloneDefinition(clone).handler(
      createContext({ proposalId: 'proposal-1', executionError: 'action exploded' })
    );

    expect(clone).toHaveBeenCalledWith(
      { id: 'proposal-1', executionError: 'action exploded' },
      SPACE_ID
    );
    expect(result.output).toEqual({ proposalId: 'proposal-2' });
  });

  it('should assert manage before superseding anything', async () => {
    const clone = jest.fn();
    const privileges = allowAll();
    privileges.assertCanManage.mockRejectedValue(new ProposalForbiddenError('nope'));

    await expect(
      cloneDefinition(clone, privileges).handler(createContext({ proposalId: 'proposal-1' }))
    ).rejects.toMatchObject({ type: 'PermissionError' });
    expect(clone).not.toHaveBeenCalled();
  });
});
