/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { SubjectsService } from './subjects_service';
import { createThreadConversationResolver } from './thread_conversation_resolver';

const THREAD_KEY = 'slack:T1:C1:1700000000.000100';
const request = httpServerMock.createKibanaRequest();

const setup = ({ holder, readable = true }: { holder?: string; readable?: boolean } = {}) => {
  const findClaimHolder = jest.fn().mockResolvedValue(holder);
  const bulkGet = jest.fn(async (ids: string[]) =>
    readable ? new Map(ids.map((id) => [id, { id }])) : new Map()
  );
  const resolve = createThreadConversationResolver({
    getSubjectsService: () => ({ findClaimHolder } as unknown as SubjectsService),
    getConversationClient: async () => ({ bulkGet } as never),
  });
  const resolveThread = () =>
    resolve({
      origin: { type: ConversationOriginType.Slack, external_conversation_id: THREAD_KEY },
      spaceId: 'default',
      request,
    });
  return { resolveThread, findClaimHolder, bulkGet };
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
    const { resolveThread, bulkGet } = setup();

    await expect(resolveThread()).resolves.toBeUndefined();
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it('refuses with a user-facing 404 when the claiming investigation is deleted or unreadable', async () => {
    const { resolveThread, bulkGet } = setup({ holder: 'investigation-1', readable: false });

    const error = await resolveThread().catch((e) => e);

    expect(bulkGet).toHaveBeenCalledWith(['investigation-1']);
    expect(isBoom(error) && error.output.statusCode).toBe(404);
    expect(error.output.headers['x-elastic-user-facing-error']).toBe('true');
    expect(error.message).toBe("This investigation isn't available.");
  });

  it('fails the turn when the claim lookup fails', async () => {
    const { resolveThread, findClaimHolder } = setup();
    findClaimHolder.mockRejectedValueOnce(new Error('claims unavailable'));

    await expect(resolveThread()).rejects.toThrow('claims unavailable');
  });
});
