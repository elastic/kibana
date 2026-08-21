/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookLifecycle } from '@kbn/agent-builder-common';

// Mock all dependencies before the module-under-test loads.
jest.mock('../core/write_memory', () => ({ writeMemory: jest.fn() }));
jest.mock('../core/authorize_request', () => ({ authorizeMemoryRequest: jest.fn() }));

jest.mock('@kbn/inference-tracing', () => ({
  withActiveInferenceSpan: jest.fn((_name: string, _opts: unknown, fn: (span: null) => unknown) =>
    fn(null)
  ),
}));

import { registerCaptureHook } from './capture_memories';
import { writeMemory } from '../core/write_memory';
import { authorizeMemoryRequest } from '../core/authorize_request';

const mockWriteMemory = jest.mocked(writeMemory);
const mockAuthorizeMemoryRequest = jest.mocked(authorizeMemoryRequest);

const AUTHORIZED = { status: 'authorized' as const, identity: { author: 'uid-1', author_kind: 'profile_uid' as const } };

const makeContext = (previousRoundsLength: number) => ({
  request: {} as never,
  abortSignal: undefined,
  nextInput: { message: 'hello', attachment_context: undefined },
  agentId: 'elastic-ai-agent',
  agentConfiguration: { enable_elastic_capabilities: false, tools: [], skill_ids: [] } as never,
  previousRounds: Array.from({ length: previousRoundsLength }, (_, i) => ({
    input: { message: `user turn ${i + 1}` },
    output: { message: `assistant turn ${i + 1}` },
  })) as never,
  connectorId: '.openai-gpt-5.4-mini-chat_completion',
  conversationId: 'conv-1',
});

const registerAndGetHandler = (captureEveryNMessages: number, mockOutput: jest.Mock) => {
  const registered: Array<(ctx: never) => Promise<unknown>> = [];
  const hooksSetup = {
    register: jest.fn((bundle: { hooks: { [k: string]: { handler: (ctx: never) => Promise<unknown> } } }) => {
      const hookEntry = bundle.hooks[HookLifecycle.beforeAgent];
      if (hookEntry) registered.push(hookEntry.handler);
    }),
  };

  registerCaptureHook({
    hooksSetup: hooksSetup as never,
    getStorage: jest.fn().mockReturnValue({}),
    getCurrentUserEsClient: jest.fn().mockReturnValue({}),
    getSecurity: jest.fn(),
    getCoreSecurity: jest.fn(),
    getSpaceId: jest.fn().mockReturnValue('default'),
    getInference: () => ({ getClient: () => ({ output: mockOutput }) } as never),
    captureEveryNMessages,
    logger: { warn: jest.fn(), debug: jest.fn() } as never,
  });

  return registered[0];
};

describe('registerCaptureHook', () => {
  afterEach(() => jest.clearAllMocks());

  it('skips extraction when captureEveryNMessages is 0', async () => {
    const mockOutput = jest.fn();
    const handler = registerAndGetHandler(0, mockOutput);
    expect(handler).toBeDefined();

    await handler(makeContext(3) as never);

    expect(mockAuthorizeMemoryRequest).not.toHaveBeenCalled();
    expect(mockOutput).not.toHaveBeenCalled();
  });

  it('skips extraction when previousRounds.length is not a multiple of N', async () => {
    mockAuthorizeMemoryRequest.mockResolvedValue(AUTHORIZED);
    const mockOutput = jest.fn();
    const handler = registerAndGetHandler(3, mockOutput);
    expect(handler).toBeDefined();

    // 2 rounds — boundary is every 3, should not fire.
    await handler(makeContext(2) as never);

    expect(mockOutput).not.toHaveBeenCalled();
  });

  it('extracts and writes memories when previousRounds.length hits the boundary', async () => {
    mockAuthorizeMemoryRequest.mockResolvedValue(AUTHORIZED);
    const mockOutput = jest.fn().mockResolvedValue({
      output: {
        memories: [
          {
            title: 'User likes cats',
            description: 'Prefers cats over dogs',
            category: 'preferences',
            type: 'semantic',
            tags: [],
          },
        ],
      },
    });

    const handler = registerAndGetHandler(3, mockOutput);
    expect(handler).toBeDefined();

    // 3 rounds — exactly on boundary.
    await handler(makeContext(3) as never);

    expect(mockOutput).toHaveBeenCalledTimes(1);
    expect(mockWriteMemory).toHaveBeenCalledTimes(1);
    expect(mockWriteMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          title: 'User likes cats',
          call_source: 'hook',
        }),
      })
    );
  });
});
