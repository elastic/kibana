/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
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
  eventBus,
}: { agents?: object; attachments?: object; eventBus?: object } = {}) => {
  return new ConversationServiceImpl({
    logger: loggingSystemMock.createLogger(),
    security: {} as never,
    elasticsearch: {
      client: {
        asScoped: jest.fn().mockReturnValue({ asCurrentUser, asInternalUser }),
      },
    } as never,
    agents: agents as never,
    conversationEvents: { getDefinition: jest.fn(), list: jest.fn().mockReturnValue([]) },
    ...(eventBus ? { eventBus: eventBus as never } : {}),
  });
};

describe('ConversationServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserFromRequestMock.mockResolvedValue({ id: 'profile-1', username: 'jane', isAdmin: false });
  });

  describe('getScopedClient', () => {
    const agents = { getRegistry: jest.fn().mockResolvedValue({ id: 'registry' }) };

    it('wires the scoped event emitter to the event bus with the request', async () => {
      const eventBus = { emitMetadataPatched: jest.fn(), emitAttachmentEvents: jest.fn() };
      await createService({ agents, eventBus }).getScopedClient({ request });

      const { eventEmitter } = createClientMock.mock.calls[0][0];
      const metadataPayload = { conversationId: 'conv-1', changedFields: ['x'] };
      const attachmentPayload = { conversationId: 'conv-1', events: [] };
      eventEmitter!.emitMetadataPatched(metadataPayload);
      eventEmitter!.emitAttachmentEvents(attachmentPayload);

      expect(eventBus.emitMetadataPatched).toHaveBeenCalledWith(request, metadataPayload);
      expect(eventBus.emitAttachmentEvents).toHaveBeenCalledWith(request, attachmentPayload);
    });

    it('leaves eventEmitter undefined without an event bus', async () => {
      await createService({ agents }).getScopedClient({ request });

      expect(createClientMock.mock.calls[0][0].eventEmitter).toBeUndefined();
    });

    it.each([true, false])('passes isAdmin=%s through to the client', async (isAdmin) => {
      const user = { id: 'profile-1', username: 'jane', isAdmin };
      getUserFromRequestMock.mockResolvedValue(user);

      await createService({ agents }).getScopedClient({ request });

      expect(createClientMock).toHaveBeenCalledWith(expect.objectContaining({ user }));
    });

    it('acts as the given user, without resolving the request identity', async () => {
      const owner = { id: 'profile-alice', username: 'alice', isAdmin: false };

      await createService({ agents }).getScopedClientAsUser({ request, user: owner });

      expect(getUserFromRequestMock).not.toHaveBeenCalled();
      expect(createClientMock).toHaveBeenCalledWith(expect.objectContaining({ user: owner }));
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
});
