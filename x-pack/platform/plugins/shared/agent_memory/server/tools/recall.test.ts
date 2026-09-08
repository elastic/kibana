/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools/handler';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ElasticsearchClient } from '@kbn/core/server';
import { resolveIdentity } from '../core/resolve_identity';
import { recallMemory } from '../core/recall_memory';
import { createRecallTool } from './recall';

jest.mock('../core/resolve_identity', () => ({
  resolveIdentity: jest.fn().mockReturnValue({ author: 'user-1', author_kind: 'username' }),
}));
jest.mock('../core/recall_memory', () => ({
  recallMemory: jest.fn().mockResolvedValue({ memories: [] }),
}));

const asCurrentUser = { _tag: 'current-user' } as unknown as ElasticsearchClient;
const asInternalUser = { _tag: 'kibana-system' } as unknown as ElasticsearchClient;
const storage = { getClient: jest.fn() };
const getStorage = jest.fn().mockReturnValue(storage);
const getCoreSecurity = jest.fn().mockReturnValue({});
const logger = { warn: jest.fn() };
const mockContext = {
  request: {},
  spaceId: 'space-1',
  esClient: { asCurrentUser, asInternalUser },
  logger,
} as unknown as ToolHandlerContext;

describe('createRecallTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(resolveIdentity).mockReturnValue({ author: 'user-1', author_kind: 'username' });
    jest.mocked(recallMemory).mockResolvedValue({ memories: [] });
  });

  it('recalls Agent Memory as the current user', async () => {
    const tool = createRecallTool({ getStorage, getCoreSecurity });

    await expect(
      tool.handler(
        {
          query: 'preferences',
          tags: ['project:phoenix', 'source:workflow'],
          limit: 10,
        } as never,
        mockContext
      )
    ).resolves.toEqual({
      results: [{ type: ToolResultType.other, data: { memories: [] } }],
    });

    expect(getStorage).toHaveBeenCalledWith(asCurrentUser);
    expect(getStorage).not.toHaveBeenCalledWith(asInternalUser);
    expect(recallMemory).toHaveBeenCalledWith({
      storage,
      logger,
      params: {
        query: 'preferences',
        category: undefined,
        tags: ['project:phoenix', 'source:workflow'],
        limit: 10,
        space_id: 'space-1',
        identity: { author: 'user-1', author_kind: 'username' },
      },
    });
  });

  it('fails open when identity is unavailable', async () => {
    jest.mocked(resolveIdentity).mockReturnValue(undefined);
    const tool = createRecallTool({ getStorage, getCoreSecurity });

    await expect(tool.handler({ query: 'preferences', limit: 10 }, mockContext)).resolves.toEqual({
      results: [
        {
          type: ToolResultType.other,
          data: { memories: [], note: 'No user identity available; recall skipped.' },
        },
      ],
    });

    expect(recallMemory).not.toHaveBeenCalled();
  });
});
