/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import { coreMock } from '@kbn/core/server/mocks';
import { assertContextEngineWriteAccess } from '../../assert_context_engine_write_access';
import { createForgetTool } from './tool';

jest.mock('../../assert_context_engine_write_access', () => ({
  assertContextEngineWriteAccess: jest.fn(),
}));

describe('forget tool', () => {
  const forget = jest.fn();
  const coreStart = coreMock.createStart();

  const tool = createForgetTool({
    getContextEngineStart: async () =>
      ({ getSessionMemoryService: () => ({ forget }) } as unknown as ContextEnginePluginStart),
    getCoreStart: async () => coreStart,
    getSecurityStart: async () => undefined,
  });

  const context = {
    ...agentBuilderMocks.tools.createHandlerContext(),
    spaceId: 'space-1',
  } as unknown as ToolHandlerContext;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(assertContextEngineWriteAccess).mockResolvedValue();
    coreStart.userProfile.getCurrentProfileId.mockResolvedValue('profile-1');
    forget.mockResolvedValue({ 'memory-1': 'forgotten' });
  });

  it("tombstones the memory in the user's session memory and reports the outcome", async () => {
    const result = await tool.handler({ id: 'memory-1' }, context);

    expect(forget).toHaveBeenCalledWith({ space: 'space-1', userId: 'profile-1' }, ['memory-1']);
    expect(result).toEqual({
      results: [{ type: ToolResultType.other, data: { id: 'memory-1', outcome: 'forgotten' } }],
    });
  });

  it('returns an error result when the write access check fails', async () => {
    jest.mocked(assertContextEngineWriteAccess).mockRejectedValue(new Error('no access'));

    const result = await tool.handler({ id: 'memory-1' }, context);

    expect(result).toEqual({
      results: [
        { type: ToolResultType.error, data: { message: 'Failed to forget memory: no access' } },
      ],
    });
    expect(forget).not.toHaveBeenCalled();
  });
});
