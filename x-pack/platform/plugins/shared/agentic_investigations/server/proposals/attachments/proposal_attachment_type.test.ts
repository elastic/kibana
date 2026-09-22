/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ProposalAttachmentData, ProposalWithMetadata } from '../../../common/proposals';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../common/proposals';
import type { ProposalsService } from '../services/proposals_service';
import { ProposalForbiddenError } from '../services/errors';
import { createProposalAttachmentType } from './proposal_attachment_type';

const SPACE_ID = 'default';
const REQUEST = httpServerMock.createKibanaRequest();
const UNAVAILABLE = '## Investigation proposal: currently unavailable';

const proposal = (overrides: Partial<ProposalWithMetadata> = {}): ProposalWithMetadata => ({
  id: 'proposal-1',
  spaceId: SPACE_ID,
  conversationId: 'conv-1',
  comment: 'Tune the noisy rule',
  status: 'pending',
  impact: 'high',
  confidence: 'high',
  category: 'configure',
  origin: 'worker',
  createdAt: '2026-09-01T00:00:00.000Z',
  expired: false,
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
    it('should accept a bare proposal id', () => {
      const { type } = createType();

      expect(type.validate({ proposalId: 'proposal-1' })).toEqual({
        valid: true,
        data: { proposalId: 'proposal-1' },
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
    it('should describe the proposal as it is now, not as it was attached', async () => {
      const { type, get } = createType();
      get.mockResolvedValue(proposal({ status: 'no_action', decision: 'dismissed' }));

      const representation = await represent(type);

      expect(get).toHaveBeenCalledWith('proposal-1', SPACE_ID);
      expect(representation).toEqual({
        type: 'text',
        value: expect.stringContaining('Status: no_action'),
      });
    });

    it('should read the id from the payload when the attachment has no origin', async () => {
      const { type, get } = createType();

      await represent(type, attachment({ origin: undefined, data: { proposalId: 'proposal-9' } }));

      expect(get).toHaveBeenCalledWith('proposal-9', SPACE_ID);
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
