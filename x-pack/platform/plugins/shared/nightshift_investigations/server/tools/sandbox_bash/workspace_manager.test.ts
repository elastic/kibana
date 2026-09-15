/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { backupConversationWorkspace } from './workspace_manager';

describe('workspace backup after execution', () => {
  it('backs up the same space-scoped workspace used by sandbox tools', async () => {
    const backupWorkspace = jest.fn().mockResolvedValue(undefined);
    await backupConversationWorkspace({
      conversationId: 'conversation-1',
      spaceId: 'marketing',
      workspaceManager: { backupWorkspace },
      logger: loggingSystemMock.createLogger(),
    });
    expect(backupWorkspace).toHaveBeenCalledWith('marketing__conversation-1');
  });
});
