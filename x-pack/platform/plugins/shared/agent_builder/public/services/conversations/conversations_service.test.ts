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
import { publicApiPath } from '../../../common/constants';
import { ConversationsService } from './conversations_service';

describe('ConversationsService', () => {
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
