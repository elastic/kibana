/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalAlreadyExistsError, ProposalNotFoundError } from '@kbn/proposals-plugin/server';
import { createProposalsProvider } from './proposals_provider';

const request = {} as never;
const proposal = {
  id: 'context-engine-abc',
  conversationId: 'context-engine:orders',
  title: 'Add a KI',
  comment: 'Because.',
  actionWorkflowId: 'system-context-engine-action-add-ki',
  actionInput: { ai_index_id: 'orders' },
};

describe('createProposalsProvider', () => {
  const createProposal = jest.fn();
  const get = jest.fn();
  const provider = createProposalsProvider(
    async () => ({ createProposal, getProposalsService: () => ({ get }) } as never)
  );

  beforeEach(() => jest.resetAllMocks());

  describe('create', () => {
    it('proposes gateless, for Context Engine, under the given id', async () => {
      createProposal.mockResolvedValue({});

      await expect(provider.create({ proposal, spaceId: 'default', request })).resolves.toBe(true);

      expect(createProposal).toHaveBeenCalledWith({
        request,
        spaceId: 'default',
        conversationId: 'context-engine:orders',
        proposal: expect.objectContaining({
          gate: 'none',
          origin: 'context_engine',
          id: 'context-engine-abc',
          actionWorkflowId: 'system-context-engine-action-add-ki',
        }),
      });
    });

    it('resolves false when the proposal already exists', async () => {
      createProposal.mockRejectedValue(new ProposalAlreadyExistsError('context-engine-abc'));

      await expect(provider.create({ proposal, spaceId: 'default', request })).resolves.toBe(false);
    });

    it('lets any other failure through', async () => {
      createProposal.mockRejectedValue(new Error('disabled'));

      await expect(provider.create({ proposal, spaceId: 'default', request })).rejects.toThrow(
        'disabled'
      );
    });
  });

  describe('getOutcome', () => {
    const outcome = (proposalStatus: Record<string, unknown>) => {
      get.mockResolvedValue(proposalStatus);
      return provider.getOutcome({ proposalId: 'p', spaceId: 'default', request });
    };

    it('reads a missing proposal as null', async () => {
      get.mockRejectedValue(new ProposalNotFoundError('p'));

      await expect(
        provider.getOutcome({ proposalId: 'p', spaceId: 'default', request })
      ).resolves.toBeNull();
    });

    it('maps what the proposal went through to what the store records', async () => {
      await expect(outcome({ status: 'pending' })).resolves.toEqual({ state: 'open' });
      await expect(outcome({ status: 'executing' })).resolves.toEqual({ state: 'open' });
      await expect(
        outcome({ status: 'succeeded', decidedBy: { username: 'ana' } })
      ).resolves.toEqual({ state: 'applied', by: 'ana' });
      await expect(
        outcome({ status: 'no_action', decidedBy: { username: 'ana' }, rationale: 'dup' })
      ).resolves.toEqual({ state: 'rejected', by: 'ana', reason: 'dup' });
      await expect(outcome({ status: 'failed', executionError: 'denied' })).resolves.toEqual({
        state: 'failed',
        error: 'denied',
      });
    });
  });
});
