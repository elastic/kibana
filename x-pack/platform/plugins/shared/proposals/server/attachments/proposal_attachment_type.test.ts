/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ProposalAttachmentData, ProposalWithMetadata } from '@kbn/proposals-common';
import { PROPOSAL_ATTACHMENT_TYPE } from '@kbn/proposals-common';
import type { ProposalsService } from '../services/proposals_service';
import { ProposalForbiddenError } from '../services/errors';
import { createProposalAttachmentType } from './proposal_attachment_type';

const SPACE_ID = 'default';
const REQUEST = httpServerMock.createKibanaRequest();
const UNAVAILABLE = '## Proposal: currently unavailable';

const proposal = (overrides: Partial<ProposalWithMetadata> = {}): ProposalWithMetadata => ({
  id: 'proposal-1',
  spaceId: SPACE_ID,
  conversationId: 'conv-1',
  title: 'Tune the noisy rule',
  comment: 'Tune the noisy rule',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'configure',
  origin: 'alertzero',
  createdAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

const attachment = (
  overrides: Partial<Attachment<typeof PROPOSAL_ATTACHMENT_TYPE, ProposalAttachmentData>> = {}
) =>
  ({
    id: 'attachment-1',
    type: PROPOSAL_ATTACHMENT_TYPE,
    data: { proposalId: 'proposal-1' },
    origin: 'proposal-1',
    ...overrides,
  } as Attachment<typeof PROPOSAL_ATTACHMENT_TYPE, ProposalAttachmentData>);

const createType = () => {
  const get = jest.fn().mockResolvedValue(proposal());
  const privileges = {
    assertCanManage: jest.fn().mockResolvedValue(undefined),
    assertCanRead: jest.fn().mockResolvedValue(undefined),
    canManage: jest.fn().mockResolvedValue(true),
  };
  const logger = loggerMock.create();

  return {
    type: createProposalAttachmentType({
      getProposalsService: () => ({ get } as unknown as ProposalsService),
      privileges,
      logger,
    }),
    get,
    privileges,
    logger,
  };
};

/**
 * The representation the agent is given, which is where the live read happens.
 * `getRepresentation` is optional on the contract but always set by this type.
 */
const represent = async (type: ReturnType<typeof createType>['type'], input = attachment()) => {
  const formatted = await type.format(input, { request: REQUEST, spaceId: SPACE_ID });
  return formatted.getRepresentation!();
};

describe('proposalAttachmentType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    // The label is rendered synchronously, so an attachment without one has
    // nothing to show — and `create()` always resolves a title to write here.
    it('should reject a bare proposal id, with no title to label the card', () => {
      const { type } = createType();

      expect(type.validate({ proposalId: 'proposal-1' })).toMatchObject({ valid: false });
    });

    // The only thing the synchronous card label has to go on, so it is the one
    // field allowed alongside the id.
    it('should accept the title the card labels itself with', () => {
      const { type } = createType();

      expect(type.validate({ proposalId: 'proposal-1', title: 'Create rule' })).toEqual({
        valid: true,
        data: { proposalId: 'proposal-1', title: 'Create rule' },
      });
    });

    // The old shape was the whole proposal. Anything still carrying a snapshot
    // must be refused rather than silently stripped down to nothing.
    it('should reject a payload with no proposal id', () => {
      const { type } = createType();

      expect(type.validate({ comment: 'Tune the noisy rule' })).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    it.each<Partial<ProposalWithMetadata>>([
      { status: 'pending' },
      { status: 'superseded', supersededBy: 'proposal-2' },
      { status: 'failed', decision: 'approved', supersededBy: 'proposal-2' },
    ])('exposes its own proposal ID to the agent: %j', async (overrides) => {
      const { type, get } = createType();
      get.mockResolvedValue(proposal(overrides));

      expect(await represent(type)).toEqual({
        type: 'text',
        value: expect.stringContaining('Proposal ID: proposal-1'),
      });
    });

    it('exposes complete revision content and history without storage bookkeeping', async () => {
      const { type, get } = createType();
      const comment =
        '**Create a rule**\n\nKeep this rationale and disabled-rule warning.\n\n| Index | `logs*` |';
      const actionInput = {
        name: 'Repeated failed logons',
        index: ['logs*'],
        query: 'event.category:authentication',
        severity: 'medium',
        risk_score: 47,
        settings: { enabled: false },
      };
      get.mockResolvedValue(
        proposal({
          rootProposalId: 'root-1',
          revision: 2,
          supersedes: 'root-1',
          supersededBy: 'proposal-3',
          status: 'superseded',
          comment,
          actionInput,
          actionWorkflowId: 'create-rule',
          workflowExecutionId: 'internal-execution',
          executionError: 'Previous execution failed',
          decidedBy: { username: 'analyst', fullName: null, email: null },
        })
      );

      const representation = await represent(type);
      if (representation.type !== 'text') {
        throw new Error('expected text representation');
      }
      const data = JSON.parse(representation.value.slice(representation.value.indexOf('{')));
      expect(data).toMatchObject({
        id: 'proposal-1',
        rootProposalId: 'root-1',
        revision: 2,
        supersedes: 'root-1',
        supersededBy: 'proposal-3',
        status: 'superseded',
        expired: false,
        comment,
        actionInput,
        actionWorkflowId: 'create-rule',
        executionError: 'Previous execution failed',
        decidedBy: { username: 'analyst' },
      });
      expect(data).not.toHaveProperty('spaceId');
      expect(data).not.toHaveProperty('conversationId');
      expect(data).not.toHaveProperty('workflowExecutionId');
    });

    it('should describe the proposal as it is now, not as it was attached', async () => {
      const { type, get } = createType();
      get.mockResolvedValue(proposal({ status: 'no_action', decision: 'dismissed' }));

      const representation = await represent(type);

      expect(get).toHaveBeenCalledWith('proposal-1', SPACE_ID, REQUEST);
      expect(representation).toEqual({
        type: 'text',
        value: expect.stringContaining('Status: no_action'),
      });
    });

    // Saying a decision was pending underneath the expiry banner contradicted it, and dropped the
    // "do not decide this yourself" instruction exactly where it matters most.
    it('should not report a pending decision once the gate settles the proposal as expired', async () => {
      const { type, get } = createType();
      get.mockResolvedValue(proposal({ status: 'expired' }));

      const { value } = (await represent(type)) as { value: string };

      expect(value).toContain('EXPIRED');
      expect(value).not.toContain('Decision: pending');
      expect(value).not.toContain('Awaiting a human decision');
      // The gate can settle a proposal as expired before its deadline, so the
      // banner must not claim the deadline is what passed.
      expect(value).not.toContain('deadline has passed');
    });

    it.each<Partial<ProposalWithMetadata>>([
      { status: 'superseded', supersededBy: 'proposal-2' },
      { status: 'failed', decision: 'approved', supersededBy: 'proposal-2' },
      { status: 'pending', supersededBy: 'proposal-2' },
      { status: 'expired', supersededBy: 'proposal-2' },
      { status: 'superseded' },
    ])('describes replaced proposals as historical: %j', async (overrides) => {
      const { type, get } = createType();
      get.mockResolvedValue(proposal(overrides));

      const representation = await represent(type);
      expect(representation).toEqual({
        type: 'text',
        value: expect.stringContaining(
          'REPLACED: this proposal is historical and cannot be acted on.'
        ),
      });
      expect(representation).toEqual({
        type: 'text',
        value: expect.not.stringContaining('Awaiting a human decision'),
      });
      if (overrides.supersededBy) {
        expect(representation).toEqual({
          type: 'text',
          value: expect.stringContaining('Replacement proposal ID: proposal-2.'),
        });
      }
      expect(get).toHaveBeenCalledTimes(1);
      expect(get).toHaveBeenCalledWith('proposal-1', SPACE_ID, REQUEST);
    });

    it('should read the id from the payload when the attachment has no origin', async () => {
      const { type, get } = createType();

      await represent(
        type,
        attachment({
          origin: undefined,
          data: { proposalId: 'proposal-9', title: 'Tune the noisy rule' },
        })
      );

      expect(get).toHaveBeenCalledWith('proposal-9', SPACE_ID, REQUEST);
    });

    // The service reads as the internal user, and the public attachment API
    // lets a caller name any proposal id — so without this the attachment is a
    // way to read proposals you have no privilege for.
    it('should not read the proposal when the caller may not read proposals', async () => {
      const { type, get, privileges } = createType();
      privileges.assertCanRead.mockRejectedValue(new ProposalForbiddenError('nope'));

      const representation = await represent(type);

      expect(privileges.assertCanRead).toHaveBeenCalledWith(REQUEST);
      expect(get).not.toHaveBeenCalled();
      expect(representation).toEqual({ type: 'text', value: UNAVAILABLE });
    });

    // Identical to the refusal above, so the agent cannot be used to probe
    // which proposal ids exist.
    it('should say the same thing when the proposal cannot be found', async () => {
      const { type, get } = createType();
      get.mockRejectedValue(new Error('not found'));

      expect(await represent(type)).toEqual({ type: 'text', value: UNAVAILABLE });
    });
  });
});
