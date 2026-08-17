/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { createRememberTool } from './remember';
import { writeMemory } from '../core/write_memory';
import { resolveIdentity } from '../core/resolve_identity';

jest.mock('../core/write_memory', () => ({
  writeMemory: jest.fn().mockResolvedValue({ id: 'mem-1', revision: 1, action: 'created' }),
}));

jest.mock('../core/resolve_identity', () => ({
  resolveIdentity: jest.fn().mockReturnValue({ author: 'user-1', author_kind: 'username' }),
}));

const asCurrentUser = { _tag: 'current-user' } as unknown as ElasticsearchClient;
const asInternalUser = { _tag: 'kibana-system' } as unknown as ElasticsearchClient;

const mockStorage = { getClient: jest.fn() };
const getStorage = jest.fn().mockReturnValue(mockStorage);
const getSecurityStart = jest.fn().mockReturnValue({
  authz: {
    checkPrivilegesWithRequest: () => ({
      atSpace: async () => ({ hasAllRequested: true }),
    }),
    actions: { api: { get: (privilege: string) => privilege } },
  },
});
const getCoreSecurity = jest.fn().mockReturnValue({});

const mockContext = {
  spaceId: 'default',
  request: {},
  esClient: { asCurrentUser, asInternalUser },
  callContext: { callSource: 'agent' },
} as unknown as ToolHandlerContext;

describe('createRememberTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getStorage.mockReturnValue(mockStorage);
    (writeMemory as jest.Mock).mockResolvedValue({ id: 'mem-1', revision: 1, action: 'created' });
    (resolveIdentity as jest.Mock).mockReturnValue({ author: 'user-1', author_kind: 'username' });
  });

  it('requires primary confirmation that shows the memory title and content', async () => {
    const tool = createRememberTool({
      getStorage,
      getSecurityStart,
      getCoreSecurity,
    });

    expect(tool.confirmation?.askUser).toBe('always');
    const confirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: {
        title: 'Preferred editor',
        description: 'The user prefers Vim.',
      },
    });

    expect(confirmation).toEqual({
      title: 'Remember "Preferred editor"',
      message: 'Save this memory for future conversations?\n\nThe user prefers Vim.',
      confirm_text: 'Remember',
      color: 'primary',
    });
  });

  it('writes to Agent Memory as the current user, not kibana_system', async () => {
    const tool = createRememberTool({
      getStorage,
      getSecurityStart,
      getCoreSecurity,
    });

    const result = await tool.handler(
      { title: "User's name is Susah", description: "The user's name is Susah." },
      mockContext
    );

    expect(getStorage).toHaveBeenCalledWith(asCurrentUser);
    expect(getStorage).not.toHaveBeenCalledWith(asInternalUser);
    expect(writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        storage: mockStorage,
        esClient: asCurrentUser,
      })
    );
    expect(result).toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { id: 'mem-1', revision: 1, action: 'created' },
        },
      ],
    });
  });
});
