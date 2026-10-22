/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { SubjectsService } from './subjects_service';
import { createThreadConversationResolver } from './thread_conversation_resolver';

const THREAD_KEY = 'slack:T1:C1:1700000000.000100';
const request = httpServerMock.createKibanaRequest();

const setup = ({ holder }: { holder?: string } = {}) => {
  const findClaimHolder = jest.fn().mockResolvedValue(holder);
  const resolve = createThreadConversationResolver({
    getSubjectsService: () => ({ findClaimHolder } as unknown as SubjectsService),
  });
  const resolveThread = () =>
    resolve({
      origin: { type: ConversationOriginType.Slack, external_conversation_id: THREAD_KEY },
      spaceId: 'default',
      request,
    });
  return { resolveThread, findClaimHolder };
};

describe('createThreadConversationResolver', () => {
  it('continues the investigation that claimed the thread', async () => {
    const { resolveThread, findClaimHolder } = setup({ holder: 'investigation-1' });

    await expect(resolveThread()).resolves.toEqual({ conversationId: 'investigation-1' });
    expect(findClaimHolder).toHaveBeenCalledWith(
      { type: 'slack_thread', id: THREAD_KEY },
      'default'
    );
  });

  it('leaves a thread no investigation claimed to the next resolver', async () => {
    const { resolveThread } = setup();

    await expect(resolveThread()).resolves.toBeUndefined();
  });

  it('fails the turn when the claim lookup fails', async () => {
    const { resolveThread, findClaimHolder } = setup();
    findClaimHolder.mockRejectedValueOnce(new Error('claims unavailable'));

    await expect(resolveThread()).rejects.toThrow('claims unavailable');
  });
});
