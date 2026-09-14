/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
} from '@kbn/agent-builder-common';
import { publicApiPath, internalApiPath } from '../../../common/constants';
import { ConversationsService } from './conversations_service';

describe('ConversationsService', () => {
  it('requests _search with the snake_case query mapping', async () => {
    const get = jest.fn().mockResolvedValue({
      pagination: { total: 0, page: 1, per_page: 25 },
      results: [],
    });
    const service = new ConversationsService({ http: { get } as never });

    await service.search({ query: 'sales', agentId: 'agent-1', page: 2, perPage: 25 });

    expect(get).toHaveBeenCalledWith(`${internalApiPath}/conversations/_search`, {
      query: {
        query: 'sales',
        agent_id: 'agent-1',
        page: 2,
        per_page: 25,
      },
    });
  });

  it('updates conversation access control', async () => {
    const put = jest.fn().mockResolvedValue({
      access_mode: ConversationAccessControlMode.Private,
      entries: [],
    });
    const service = new ConversationsService({ http: { put } as never });
    const accessControl = {
      access_mode: ConversationAccessControlMode.Private,
      entries: [
        {
          type: 'user' as const,
          id: 'u_123',
          role: ConversationAccessControlRole.Member,
        },
      ],
    };

    await service.updateAccessControl({ conversationId: 'conversation-1', accessControl });

    expect(put).toHaveBeenCalledWith(
      `${publicApiPath}/conversations/conversation-1/access_control`,
      {
        body: JSON.stringify(accessControl),
      }
    );
  });
});
