/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProposalAlreadyExistsError } from '@kbn/proposals-plugin/server';
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
  const getList = jest.fn();
  const provider = createProposalsProvider(
    async () => ({ createProposal, getProposalsService: () => ({ list: getList }) } as never)
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

  describe('list', () => {
    const list = (proposals: Array<Record<string, unknown>>, total = proposals.length) => {
      getList.mockResolvedValue({ proposals, total });
      return provider.list({
        conversationId: 'context-engine:orders',
        size: 50,
        spaceId: 'default',
        request,
      });
    };

    it('reads the newest proposals Context Engine put under the anchor, whatever became of them', async () => {
      await list([]);

      expect(getList).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: 'context_engine',
          conversationId: 'context-engine:orders',
          order: 'newest',
          excludeSuperseded: false,
          excludeExpired: false,
          size: 50,
        }),
        'default',
        request
      );
    });

    it('maps what the proposal went through to what a run reads', async () => {
      await expect(
        list(
          [
            { id: 'a', title: 'A', status: 'pending' },
            {
              id: 'b',
              title: 'B',
              status: 'no_action',
              dismissReason: 'duplicate',
              rationale: 'kept on purpose',
              actionWorkflowId: 'wf',
              actionInput: { ki_id: 'k' },
            },
            { id: 'c', title: 'C', status: 'failed', executionError: 'denied' },
            { id: 'd', title: 'D', status: 'no_action', dismissReason: 'no_reason' },
          ],
          9
        )
      ).resolves.toEqual({
        total: 9,
        items: [
          { id: 'a', title: 'A', status: 'pending' },
          {
            id: 'b',
            title: 'B',
            status: 'no_action',
            reason: 'duplicate: kept on purpose',
            actionWorkflowId: 'wf',
            actionInput: { ki_id: 'k' },
          },
          { id: 'c', title: 'C', status: 'failed', error: 'denied' },
          { id: 'd', title: 'D', status: 'no_action' },
        ],
      });
    });
  });
});
