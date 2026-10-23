/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { Hypothesis } from '../../common/hypotheses/hypotheses';
import { attachImpactToInvestigation } from '../impact/attachments/attach_impact_to_investigation';
import { createFindingsWriter } from './findings_writer';

jest.mock('../impact/attachments/attach_impact_to_investigation', () => ({
  attachImpactToInvestigation: jest.fn(),
}));

const hypotheses: Hypothesis[] = [
  {
    candidate: 'Bad deploy',
    confidence: 0.8,
    status: 'confirmed',
    reason: 'Errors began at rollout.',
  },
];

describe('createFindingsWriter', () => {
  const request = httpServerMock.createKibanaRequest();
  const conversations = { get: jest.fn() };
  const attachments = { create: jest.fn() };
  const user = { username: 'elastic' };

  const setup = ({ canManage = true }: { canManage?: boolean } = {}) => {
    const hypothesesService = { setWithPublicClient: jest.fn().mockResolvedValue(undefined) };
    const impactService = {
      set: jest.fn().mockResolvedValue({}),
      getByConversationId: jest.fn(),
      revertAttach: jest.fn(),
    };
    const privileges = {
      assertCanManage: jest.fn(async () => {
        if (!canManage) throw new Error('forbidden');
      }),
    };
    const writer = createFindingsWriter({
      getHypothesesService: () => hypothesesService as never,
      getImpactService: () => impactService as never,
      getSpaceId: () => 'space-a',
      privileges: privileges as never,
      resolveUser: async () => user as never,
      getConversationClient: async () => conversations as never,
      getAttachmentClient: async () => attachments as never,
    })(request);
    return { writer, hypothesesService, impactService, privileges };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(attachImpactToInvestigation).mockImplementation(async ({ writeImpact }) => {
      await writeImpact();
      return {} as never;
    });
  });

  it('writes hypotheses in the request space as the request user', async () => {
    const { writer, hypothesesService } = setup();

    await writer.setHypotheses({ conversationId: 'conv-1', hypotheses });

    expect(hypothesesService.setWithPublicClient).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      hypotheses,
      spaceId: 'space-a',
      user,
      conversations,
      attachments,
    });
  });

  it('sets impact through the attach helper with the same partial-snapshot semantics', async () => {
    const { writer, impactService } = setup();

    await writer.setImpact({
      conversationId: 'conv-1',
      summary: 'Checkout failed for 10 minutes.',
    });

    expect(attachImpactToInvestigation).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'conv-1', conversations, attachments })
    );
    expect(impactService.set).toHaveBeenCalledWith(
      {
        conversationId: 'conv-1',
        summary: 'Checkout failed for 10 minutes.',
        evidence: undefined,
        entities: undefined,
      },
      { spaceId: 'space-a', user }
    );
  });

  it('refuses to write without the investigations manage privilege', async () => {
    const { writer, hypothesesService, impactService } = setup({ canManage: false });

    await expect(writer.setHypotheses({ conversationId: 'c', hypotheses })).rejects.toThrow(
      'forbidden'
    );
    await expect(writer.setImpact({ conversationId: 'c', summary: 's' })).rejects.toThrow(
      'forbidden'
    );

    expect(hypothesesService.setWithPublicClient).not.toHaveBeenCalled();
    expect(impactService.set).not.toHaveBeenCalled();
  });
});
