/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_IMPROVEMENTS_PER_RUN } from '../../common/constants';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import type { ProposalsProvider } from '../proposals/provider';
import { recordImprovements } from './record_improvements';

const buildProposal = (overrides: Record<string, unknown> = {}) => ({
  action: 'add_ki',
  title: 'Add a KI for failed logins',
  rationale: 'Agents fell back to raw logs six times.',
  signal_ids: ['trace-1:span-1'],
  target: { subject: 'logs-auth-*' },
  payload: { ki: { type: 'document', title: 'Failed logins' } },
  ...overrides,
});

describe('recordImprovements', () => {
  const request = {} as never;
  const logger = { warn: jest.fn() };
  let provider: jest.Mocked<Pick<ProposalsProvider, 'create' | 'list'>>;

  const run = (overrides: Partial<Parameters<typeof recordImprovements>[0]> = {}) =>
    recordImprovements({
      aiIndexId: 'orders',
      spaceId: 'default',
      allowedActions: [...IMPROVEMENT_ACTIONS],
      proposals: [buildProposal()],
      review: {
        provider: provider as unknown as ProposalsProvider,
        context: { spaceId: 'default', request },
        logger: logger as never,
      },
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    provider = { create: jest.fn().mockResolvedValue(true), list: jest.fn() };
  });

  it('puts a valid KI improvement up as a gateless-proposal request under a deterministic id', async () => {
    const result = await run();

    expect(result.skipped).toEqual([]);
    const { improvement_id: improvementId } = result.recorded[0];
    expect(result.recorded).toEqual([
      { improvement_id: expect.any(String), action: 'add_ki', title: 'Add a KI for failed logins' },
    ]);
    expect(provider.create).toHaveBeenCalledWith({
      spaceId: 'default',
      request,
      proposal: expect.objectContaining({
        id: `context-engine-${improvementId}`,
        conversationId: 'context-engine:orders',
        title: 'Add a KI for failed logins',
        comment: 'Agents fell back to raw logs six times.',
        actionWorkflowId: 'system-context-engine-action-add-ki',
        actionInput: {
          ai_index_id: 'orders',
          ki_id: `improvement-${improvementId}`,
          ki: { type: 'document', title: 'Failed logins' },
        },
      }),
    });
  });

  it('gives the same id to the same change proposed in two different runs', async () => {
    const first = await run();
    const second = await run();

    expect(second.recorded[0].improvement_id).toBe(first.recorded[0].improvement_id);
  });

  it('scopes the derived id to the space so the same change in two spaces is two proposals', async () => {
    const first = await run({ spaceId: 'default' });
    const second = await run({ spaceId: 'marketing' });

    expect(second.recorded[0].improvement_id).not.toBe(first.recorded[0].improvement_id);
  });

  it('skips an action the index does not permit and keeps the rest', async () => {
    const result = await run({
      allowedActions: ['add_ki'],
      proposals: [buildProposal(), buildProposal({ action: 'remove_ki', target: { ki_id: 'k1' } })],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ action: 'remove_ki', reason: 'action_not_allowed' }),
    ]);
  });

  it('proposes nothing for an observe-only index', async () => {
    const result = await run({ allowedActions: [] });

    expect(result.recorded).toEqual([]);
    expect(result.skipped[0]).toMatchObject({ reason: 'action_not_allowed' });
    expect(result.skipped[0].detail).toContain('observation only');
    expect(provider.create).not.toHaveBeenCalled();
  });

  it('skips an action that has no action workflow yet instead of leaving it undecidable', async () => {
    const result = await run({
      proposals: [buildProposal({ action: 'add_workflow', payload: { workflow_yaml: 'name: x' } })],
    });

    expect(result.recorded).toEqual([]);
    expect(result.skipped).toEqual([
      expect.objectContaining({ action: 'add_workflow', reason: 'action_not_allowed' }),
    ]);
    expect(provider.create).not.toHaveBeenCalled();
  });

  it('skips a malformed proposal with the reason, rather than failing the batch', async () => {
    const result = await run({
      proposals: [buildProposal({ rationale: undefined }), buildProposal()],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({ reason: 'invalid' });
    expect(result.skipped[0].detail).toContain('rationale');
  });

  it('skips a proposal that names no target the action can be applied to', async () => {
    const result = await run({
      proposals: [buildProposal({ action: 'edit_ki', target: undefined })],
    });

    expect(result.recorded).toEqual([]);
    expect(result.skipped[0]).toMatchObject({ action: 'edit_ki', reason: 'invalid' });
  });

  it('keeps one of two proposals describing the same change', async () => {
    const result = await run({
      proposals: [buildProposal(), buildProposal({ title: 'The same thing, said again' })],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({ reason: 'duplicate', title: 'The same thing, said again' }),
    ]);
    expect(provider.create).toHaveBeenCalledTimes(1);
  });

  it('reports a change that was already proposed as a duplicate, whatever became of it', async () => {
    provider.create.mockResolvedValue(false);

    const result = await run();

    expect(result.recorded).toEqual([]);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        action: 'add_ki',
        reason: 'duplicate',
        detail: expect.stringContaining('already proposed'),
      }),
    ]);
  });

  it('reports a change that could not be put up for review, and carries on', async () => {
    provider.create.mockRejectedValueOnce(new Error('workflow [x] is disabled'));

    const result = await run({
      proposals: [buildProposal(), buildProposal({ target: { subject: 'orders' } })],
    });

    expect(result.recorded).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        reason: 'proposal_failed',
        detail: expect.stringContaining('workflow [x] is disabled'),
      }),
    ]);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('workflow [x] is disabled'));
  });

  it('caps how much one run may record', async () => {
    const proposals = Array.from({ length: MAX_IMPROVEMENTS_PER_RUN + 2 }, (_, index) =>
      buildProposal({ title: `Proposal ${index}`, target: { subject: `index-${index}` } })
    );

    const result = await run({ proposals });

    expect(result.recorded).toHaveLength(MAX_IMPROVEMENTS_PER_RUN);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0]).toMatchObject({ reason: 'limit_exceeded' });
  });

  it('spends the cap on what it accepts, not on where a proposal sat in the input', async () => {
    const result = await run({
      proposals: [
        ...Array.from({ length: MAX_IMPROVEMENTS_PER_RUN }, () => 'not an improvement'),
        buildProposal({ title: 'A good one', target: { subject: 'orders' } }),
      ],
    });

    expect(result.recorded).toEqual([expect.objectContaining({ title: 'A good one' })]);
    expect(result.skipped.every(({ reason }) => reason === 'invalid')).toBe(true);
  });

  it('survives a proposal that is not an object at all', async () => {
    const result = await run({ proposals: ['not an improvement', null] });

    expect(result.recorded).toEqual([]);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.every(({ reason }) => reason === 'invalid')).toBe(true);
  });
});
