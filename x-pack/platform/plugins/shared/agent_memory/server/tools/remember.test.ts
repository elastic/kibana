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

  it('requires primary confirmation and writes as the current user', async () => {
    const tool = createRememberTool({
      getStorage,
      getCoreSecurity,
    });

    const normalizedDescription = tool.description.replace(/\s+/g, ' ');
    expect(normalizedDescription).toMatch(/store.+user.+future recall.+across conversations/i);
    expect(normalizedDescription).toMatch(
      /do not.+ephemeral context.+search results.+intermediate reasoning/i
    );
    expect(normalizedDescription).toMatch(
      /corrects or replaces.+recall.+save the replacement.+forget.+outdated or contradictory/i
    );
    expect(normalizedDescription).toMatch(
      /returns \{ id, revision, action \} where action is 'created' or 'updated'/i
    );
    expect(tool.confirmation?.askUser).toBe('always');
    const confirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: {
        title: 'Vim keybindings caused issue in ES|QL editor',
        description: 'Opening the ES|QL editor while Vim mode is enabled causes a focus loop.',
        category: 'events',
        scope: 'user',
      },
      context: mockContext,
    });

    expect(confirmation).toEqual({
      title: 'Remember "Vim keybindings caused issue in ES|QL editor"',
      message:
        'Save this memory for future conversations?\n\nOpening the ES|QL editor while Vim mode is enabled causes a focus loop.',
      confirm_text: 'Remember',
      color: 'primary',
    });

    const spaceConfirmation = await tool.confirmation?.getConfirmation?.({
      toolParams: {
        title: 'duration_ms is a keyword field',
        description: 'Use TO_DOUBLE(duration_ms) in ES|QL.',
        category: 'procedures',
        scope: 'space',
      },
      context: mockContext,
    });

    expect(spaceConfirmation).toEqual({
      title: 'Remember "duration_ms is a keyword field"',
      message:
        'Save to team memory for this space?\n\nOthers in this space who use Agent Memory will recall it.\n\nUse TO_DOUBLE(duration_ms) in ES|QL.',
      confirm_text: 'Share with team',
      color: 'primary',
    });

    const result = await tool.handler(
      {
        title: 'Deployed payments-demo index on 2026-09-03',
        description: 'The payments-demo index was deployed to production on 2026-09-03.',
        category: 'events',
        scope: 'user',
      },
      mockContext
    );

    expect(getStorage).toHaveBeenCalledWith(asCurrentUser);
    expect(getStorage).not.toHaveBeenCalledWith(asInternalUser);
    expect(resolveIdentity).toHaveBeenCalledWith({
      request: mockContext.request,
      security: getCoreSecurity(),
    });
    expect(writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        storage: mockStorage,
        esClient: asCurrentUser,
        params: expect.objectContaining({ category: 'events' }),
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

  it('returns a clear error when identity is unavailable', async () => {
    (resolveIdentity as jest.Mock).mockReturnValue(undefined);
    const tool = createRememberTool({ getStorage, getCoreSecurity });

    await expect(
      tool.handler(
        {
          title: 'Deployed payments-demo index on 2026-09-03',
          description: 'The payments-demo index was deployed to production on 2026-09-03.',
          category: 'events',
          scope: 'user',
        },
        mockContext
      )
    ).resolves.toEqual({
      results: [
        {
          type: ToolResultType.error,
          data: { message: 'Cannot store memory: no user identity available for scoping.' },
        },
      ],
    });

    expect(writeMemory).not.toHaveBeenCalled();
  });
});
