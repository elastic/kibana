/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { GetMemoryStorage } from '../types';
import { resolveIdentity } from '../core/resolve_identity';
import { tombstoneMemory } from '../core/tombstone_memory';
import { createForgetTool } from './forget';

jest.mock('../core/resolve_identity', () => ({
  resolveIdentity: jest.fn().mockReturnValue({ author: 'user-1', author_kind: 'username' }),
}));
jest.mock('../core/tombstone_memory', () => ({
  tombstoneMemory: jest.fn().mockResolvedValue({ result: 'deleted' }),
}));

const asCurrentUser = { _tag: 'current-user' } as unknown as ElasticsearchClient;
const asInternalUser = { _tag: 'kibana-system' } as unknown as ElasticsearchClient;
const storage = { getClient: jest.fn() };
const getStorage = jest.fn().mockReturnValue(storage) as GetMemoryStorage;
const getCoreSecurity = jest.fn().mockReturnValue({});
const mockContext = {
  request: {},
  spaceId: 'space-1',
  esClient: { asCurrentUser, asInternalUser },
} as unknown as ToolHandlerContext;

describe('createForgetTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(resolveIdentity).mockReturnValue({ author: 'user-1', author_kind: 'username' });
    jest.mocked(tombstoneMemory).mockResolvedValue({ result: 'deleted' });
  });

  it('requires danger confirmation and tombstones as the current user', async () => {
    const tool = createForgetTool({
      getStorage,
      getCoreSecurity,
    });

    expect(tool.confirmation?.askUser).toBe('always');
    const confirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: { id: 'memory-123' },
      context: mockContext,
    });

    expect(confirmation).toEqual({
      title: 'Forget memory "memory-123"',
      message:
        'Soft-delete this memory? It will no longer be recalled, but remains available for audit.',
      confirm_text: 'Forget memory',
      color: 'danger',
    });

    await expect(tool.handler({ id: 'memory-123' }, mockContext)).resolves.toEqual({
      results: [{ type: ToolResultType.other, data: { result: 'deleted' } }],
    });

    expect(getStorage).toHaveBeenCalledWith(asCurrentUser);
    expect(getStorage).not.toHaveBeenCalledWith(asInternalUser);
    expect(tombstoneMemory).toHaveBeenCalledWith({
      storage,
      params: {
        id: 'memory-123',
        space_id: 'space-1',
        identity: { author: 'user-1', author_kind: 'username' },
      },
    });
  });

  it('returns a clear error when identity is unavailable', async () => {
    jest.mocked(resolveIdentity).mockReturnValue(undefined);
    const tool = createForgetTool({ getStorage, getCoreSecurity });

    await expect(tool.handler({ id: 'memory-123' }, mockContext)).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Cannot forget memory: no user identity available for scoping.' },
        },
      ],
    });

    expect(tombstoneMemory).not.toHaveBeenCalled();
  });
});
