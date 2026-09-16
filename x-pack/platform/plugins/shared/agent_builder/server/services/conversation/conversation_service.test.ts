/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationOriginType,
  TimelineEventType,
  isBadRequestError,
} from '@kbn/agent-builder-common';
import { getUserFromRequest } from '../utils';
import { createClient } from './client';
import { ConversationServiceImpl } from './conversation_service';

jest.mock('../utils');
jest.mock('./client');

const getUserFromRequestMock = getUserFromRequest as jest.MockedFunction<typeof getUserFromRequest>;
const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

const request = { headers: {} } as unknown as KibanaRequest;

// Distinct sentinels so tests can assert which scoped client each dependency receives.
const asCurrentUser = { name: 'as-current-user' } as never;
const asInternalUser = { name: 'as-internal-user' } as never;

const createService = ({
  agents = {},
  attachments = { getTypeDefinition: jest.fn() },
}: { agents?: object; attachments?: object } = {}) => {
  return new ConversationServiceImpl({
    logger: loggingSystemMock.createLogger(),
    security: {} as never,
    elasticsearch: {
      client: {
        asScoped: jest.fn().mockReturnValue({ asCurrentUser, asInternalUser }),
      },
    } as never,
    agents: agents as never,
    attachments: attachments as never,
  });
};

describe('ConversationServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserFromRequestMock.mockResolvedValue({ id: 'profile-1', username: 'jane', isAdmin: false });
  });

  describe('getScopedClient', () => {
    const agents = { getRegistry: jest.fn().mockResolvedValue({ id: 'registry' }) };

    it.each([true, false])('passes isAdmin=%s through to the client', async (isAdmin) => {
      const user = { id: 'profile-1', username: 'jane', isAdmin };
      getUserFromRequestMock.mockResolvedValue(user);

      await createService({ agents }).getScopedClient({ request });

      expect(createClientMock).toHaveBeenCalledWith(expect.objectContaining({ user }));
    });

    it('uses the internal client for conversation storage', async () => {
      await createService({ agents }).getScopedClient({ request });

      expect(createClientMock).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: asInternalUser })
      );
      expect(getUserFromRequestMock).toHaveBeenCalledWith(
        expect.objectContaining({ esClient: asCurrentUser })
      );
    });
  });

  describe('getConversationRoundAuthor', () => {
    it('prefers the external origin author over the Kibana user', async () => {
      const service = createService();
      const externalAuthor = { id: 'U123', username: 'jane', full_name: 'Jane Doe' };

      const author = await service.getConversationRoundAuthor({
        request,
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
          author: externalAuthor,
        },
      });

      expect(author).toEqual(externalAuthor);
      expect(getUserFromRequestMock).not.toHaveBeenCalled();
    });

    it('attributes rounds from an external origin without author to the current Kibana user', async () => {
      const service = createService();

      const author = await service.getConversationRoundAuthor({
        request,
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        },
      });

      expect(author).toEqual({ id: 'profile-1', username: 'jane' });
    });

    it('attributes rounds to the current Kibana user', async () => {
      const service = createService();

      const author = await service.getConversationRoundAuthor({ request });

      expect(author).toEqual({ id: 'profile-1', username: 'jane' });
    });

    it('does not assign an author when the user has no profile id', async () => {
      const service = createService();
      getUserFromRequestMock.mockResolvedValue({ username: 'jane', isAdmin: false });

      const author = await service.getConversationRoundAuthor({ request });

      expect(author).toBeUndefined();
    });
  });
  describe('appendUserMessage', () => {
    const conversation = {
      id: 'conversation-1',
      agent_id: 'agent-1',
      user: { id: 'profile-1', username: 'jane' },
      schema_version: CONVERSATION_SCHEMA_VERSION,
      attachments: [],
    };

    const accessedRefs = [{ attachment_id: 'a1', version: 1 }];
    let appendEvents: jest.Mock;
    let mergeAttachmentInputs: jest.Mock;

    const appendedEvent = () => appendEvents.mock.calls[0][0].events[0];

    const appendUserMessage = (options: { message?: string; attachments?: never[] } = {}) =>
      createService({
        agents: { getRegistry: jest.fn() },
        attachments: {
          getTypeDefinition: jest.fn(),
          createStateManager: () => ({ getAccessedRefs: () => accessedRefs, getAll: () => [] }),
          mergeAttachmentInputs,
        },
      }).appendUserMessage({ request, conversationId: 'conversation-1', ...options });

    beforeEach(() => {
      appendEvents = jest.fn();
      mergeAttachmentInputs = jest.fn();
      createClientMock.mockReturnValue({
        get: jest.fn().mockImplementation(async () => conversation),
        appendEvents,
      } as never);
    });

    it('appends one user message event carrying the accessed attachment refs', async () => {
      const before = Date.now();

      await appendUserMessage({ message: 'hello' });

      expect(appendEvents).toHaveBeenCalledTimes(1);
      expect(appendedEvent()).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        type: TimelineEventType.userMessage,
        created_at: expect.any(String),
        actor: { type: 'user', id: 'profile-1', username: 'jane' },
        data: { message: 'hello', attachment_refs: accessedRefs },
      });
      expect(Date.parse(appendedEvent().created_at)).toBeGreaterThanOrEqual(before);
    });

    it('trims the stored message and defaults it when absent', async () => {
      await appendUserMessage({ message: '  spaced  ' });
      expect(appendedEvent().data.message).toBe('spaced');

      appendEvents.mockClear();
      await appendUserMessage();
      expect(appendedEvent().data.message).toBe('');
    });

    it('rejects a conversation that predates canonical event storage as a bad request', async () => {
      createClientMock.mockReturnValue({
        get: jest.fn().mockResolvedValue({ ...conversation, schema_version: undefined }),
        appendEvents,
      } as never);

      const error = await appendUserMessage({ message: 'hello' }).catch((thrown) => thrown);

      expect(isBadRequestError(error)).toBe(true);
      expect(error.message).toContain('canonical event storage');
      expect(appendEvents).not.toHaveBeenCalled();
    });

    it('appends to read-only conversations, which are only read-only in the UI', async () => {
      createClientMock.mockReturnValue({
        get: jest.fn().mockResolvedValue({ ...conversation, read_only: true }),
        appendEvents,
      } as never);

      await appendUserMessage({ message: 'hello' });

      expect(appendEvents).toHaveBeenCalledTimes(1);
    });
  });
});
