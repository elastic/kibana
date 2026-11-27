/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { SubjectsService } from './subjects_service';
import { createClaimedThreadAdmissionCheck } from './claimed_thread_admission';

const THREAD_KEY = 'slack:T1:C1:1700000000.000100';
const request = httpServerMock.createKibanaRequest();

const setup = ({ holder }: { holder?: string } = {}) => {
  const findClaimHolder = jest.fn().mockResolvedValue(holder);
  const check = createClaimedThreadAdmissionCheck({
    getSubjectsService: () => ({ findClaimHolder } as unknown as SubjectsService),
  });
  const admitNewConversation = () =>
    check({
      origin: { type: ConversationOriginType.Slack, external_conversation_id: THREAD_KEY },
      spaceId: 'default',
      request,
      agentId: 'agent-1',
    });
  return { admitNewConversation, findClaimHolder };
};

describe('createClaimedThreadAdmissionCheck', () => {
  it('refuses with a user-facing 404 a new conversation in a thread an investigation claimed', async () => {
    const { admitNewConversation, findClaimHolder } = setup({ holder: 'investigation-1' });

    await expect(admitNewConversation()).rejects.toMatchObject({
      message: "This investigation isn't available.",
      output: { statusCode: 404, headers: { 'x-elastic-user-facing-error': 'true' } },
    });
    expect(findClaimHolder).toHaveBeenCalledWith(
      { type: 'slack_thread', id: THREAD_KEY },
      'default'
    );
  });

  it('admits a new conversation in a thread no investigation claimed', async () => {
    const { admitNewConversation } = setup();

    await expect(admitNewConversation()).resolves.toBeUndefined();
  });

  it('fails the turn when the claim lookup fails', async () => {
    const { admitNewConversation, findClaimHolder } = setup();
    findClaimHolder.mockRejectedValueOnce(new Error('claims unavailable'));

    await expect(admitNewConversation()).rejects.toThrow('claims unavailable');
  });
});
