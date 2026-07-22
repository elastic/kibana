/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ConversationAccessControlMode, ConversationOriginType } from '@kbn/agent-builder-common';
import { getUserFromRequest } from '../utils';
import { createEmptyConversation } from '../../test_utils/conversations';
import { ConversationServiceImpl } from './conversation_service';

jest.mock('../utils');

const getUserFromRequestMock = getUserFromRequest as jest.MockedFunction<typeof getUserFromRequest>;

describe('ConversationServiceImpl', () => {
  describe('getConversationRoundAuthor', () => {
    const request = { headers: {} } as unknown as KibanaRequest;

    const createService = () => {
      return new ConversationServiceImpl({
        logger: loggingSystemMock.createLogger(),
        security: {} as never,
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({ asCurrentUser: {}, asInternalUser: {} }),
          },
        } as never,
        agents: {} as never,
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
      getUserFromRequestMock.mockResolvedValue({ id: 'profile-1', username: 'jane' });
    });

    it('prefers the external origin author over the Kibana user', async () => {
      const service = createService();
      const externalAuthor = { id: 'U123', username: 'jane', full_name: 'Jane Doe' };

      const author = await service.getConversationRoundAuthor({
        request,
        conversation: createEmptyConversation({
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
          author: externalAuthor,
        },
      });

      expect(author).toEqual(externalAuthor);
      expect(getUserFromRequestMock).not.toHaveBeenCalled();
    });

    it('attributes public rounds from an external origin without author to the current Kibana user', async () => {
      const service = createService();

      const author = await service.getConversationRoundAuthor({
        request,
        conversation: createEmptyConversation({
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
        },
      });

      expect(author).toEqual({ id: 'profile-1', username: 'jane' });
    });

    it('attributes public conversations to the current Kibana user', async () => {
      const service = createService();

      const author = await service.getConversationRoundAuthor({
        request,
        conversation: createEmptyConversation({
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
      });

      expect(author).toEqual({ id: 'profile-1', username: 'jane' });
    });

    it('falls back to the username as id when the user has no profile id', async () => {
      const service = createService();
      getUserFromRequestMock.mockResolvedValue({ username: 'jane' });

      const author = await service.getConversationRoundAuthor({
        request,
        conversation: createEmptyConversation({
          access_control: { access_mode: ConversationAccessControlMode.Public },
        }),
      });

      expect(author).toEqual({ id: 'jane', username: 'jane' });
    });

    it('does not attribute private conversations', async () => {
      const service = createService();

      const author = await service.getConversationRoundAuthor({
        request,
        conversation: createEmptyConversation({
          access_control: { access_mode: ConversationAccessControlMode.Private },
        }),
      });

      expect(author).toBeUndefined();
      expect(getUserFromRequestMock).not.toHaveBeenCalled();
    });

    it('does not attribute private conversations even when the external origin provides an author', async () => {
      const service = createService();

      const author = await service.getConversationRoundAuthor({
        request,
        conversation: createEmptyConversation({
          access_control: { access_mode: ConversationAccessControlMode.Private },
        }),
        origin: {
          type: ConversationOriginType.Slack,
          external_conversation_id: 'team:T123/channel:C123/thread:1712345678.000100',
          author: { id: 'U123', username: 'jane', full_name: 'Jane Doe' },
        },
      });

      expect(author).toBeUndefined();
      expect(getUserFromRequestMock).not.toHaveBeenCalled();
    });
  });
});
