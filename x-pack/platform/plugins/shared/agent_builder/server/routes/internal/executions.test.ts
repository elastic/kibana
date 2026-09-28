/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { firstValueFrom, of, Subject, toArray } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  AgentExecutionMode,
  ChatEventType,
  TimelineEventType,
  createConversationNotFoundError,
} from '@kbn/agent-builder-common';
import { internalApiPath } from '../../../common/constants';
import { AGENT_SOCKET_TIMEOUT_MS } from '../utils';
import { registerInternalExecutionRoutes } from './executions';

const mockObservableIntoEventSourceStream = jest.fn();
jest.mock('@kbn/sse-utils-server', () => ({
  observableIntoEventSourceStream: (observable: unknown, options: unknown) =>
    mockObservableIntoEventSourceStream(observable, options),
  cloudProxyBufferSize: 4096,
}));

const reattachPath = `${internalApiPath}/executions/{executionId}/reattach`;

const executionStarted = { type: TimelineEventType.executionStarted, data: {} };
const messageChunk = { type: ChatEventType.messageChunk, data: { text_chunk: 'hello' } };
const roundComplete = { type: ChatEventType.roundComplete, data: {} };
const executionTerminated = { type: TimelineEventType.executionTerminated, data: {} };
const conversationUpdated = { type: ChatEventType.conversationUpdated, data: {} };

interface RouteConfig {
  path: string;
  options?: { timeout?: { idleSocket?: number } };
}

const setup = ({
  cloudEnabled = false,
  executionSpaceId = 'default',
  executionMode = AgentExecutionMode.conversation,
  conversationAccessError,
}: {
  cloudEnabled?: boolean;
  executionSpaceId?: string | null;
  executionMode?: AgentExecutionMode;
  conversationAccessError?: Error;
} = {}) => {
  const routes: Record<string, { config: RouteConfig; handler: Function }> = {};
  const register = (config: RouteConfig, handler: Function) => {
    routes[config.path] = { config, handler };
  };
  const followExecution = jest
    .fn()
    .mockReturnValue(
      of(executionStarted, messageChunk, roundComplete, executionTerminated, conversationUpdated)
    );
  const getExecution = jest.fn().mockResolvedValue(
    executionSpaceId === null
      ? undefined
      : {
          executionId: 'exec-1',
          spaceId: executionSpaceId,
          executionMode,
          agentParams: { conversationId: 'conv-1' },
        }
  );
  const getConversation = conversationAccessError
    ? jest.fn().mockRejectedValue(conversationAccessError)
    : jest.fn().mockResolvedValue({ id: 'conv-1' });
  const getScopedClient = jest.fn().mockResolvedValue({
    exists: jest.fn().mockResolvedValue(true),
    get: getConversation,
  });

  registerInternalExecutionRoutes({
    router: { get: register, post: register },
    getInternalServices: () => ({
      execution: { followExecution, getExecution },
      conversations: { getScopedClient },
    }),
    coreSetup: {
      getStartServices: async () => [{}, { cloud: { isCloudEnabled: cloudEnabled } }],
    },
    logger: loggingSystemMock.createLogger(),
  } as never);

  mockObservableIntoEventSourceStream.mockReset().mockReturnValue('BODY');

  const callHandler = (offset: number) =>
    routes[reattachPath].handler(
      {
        licensing: Promise.resolve({ license: { status: 'active', hasAtLeast: () => true } }),
        agentBuilder: Promise.resolve({ spaces: { getSpaceId: () => 'default' } }),
      },
      {
        params: { executionId: 'exec-1' },
        query: { offset },
        events: { aborted$: new Subject<void>() },
      },
      {
        ok: ({ body }: { body: unknown }) => ({ status: 200, payload: body }),
        notFound: ({ body }: { body: unknown }) => ({ status: 404, payload: body }),
        customError: ({ statusCode, body }: { statusCode: number; body: unknown }) => ({
          status: statusCode,
          payload: body,
        }),
      }
    );

  const callReattach = async (offset: number) => {
    const result = await callHandler(offset);
    const [streamed, options] = mockObservableIntoEventSourceStream.mock.calls[0] as [
      Observable<{ type: string }>,
      { flushMinBytes?: number }
    ];
    return { result, emitted: await firstValueFrom(streamed.pipe(toArray())), options };
  };

  return { routes, followExecution, getConversation, callHandler, callReattach };
};

describe('GET /internal/agent_builder/executions/{executionId}/reattach', () => {
  it('uses the long agent socket timeout', () => {
    const { routes } = setup();

    expect(routes[reattachPath].config.options?.timeout?.idleSocket).toBe(AGENT_SOCKET_TIMEOUT_MS);
  });

  it('streams the events-native shape: keeps lifecycle events, drops round_complete', async () => {
    const { followExecution, callReattach } = setup();

    const { result, emitted } = await callReattach(0);

    expect(followExecution).toHaveBeenCalledWith('exec-1');
    expect(result).toEqual({ status: 200, payload: 'BODY' });
    expect(emitted).toEqual([
      executionStarted,
      messageChunk,
      executionTerminated,
      conversationUpdated,
    ]);
  });

  it('skips the events the client already received, counted after round_complete is dropped', async () => {
    const { callReattach } = setup();

    const { emitted } = await callReattach(3);

    expect(emitted).toEqual([conversationUpdated]);
  });

  it('returns 404 without streaming when the execution does not exist', async () => {
    const { followExecution, callHandler } = setup({ executionSpaceId: null });

    const result = await callHandler(0);

    expect(result.status).toBe(404);
    expect(followExecution).not.toHaveBeenCalled();
  });

  it('returns 404 without streaming when the execution belongs to another space', async () => {
    const { followExecution, callHandler } = setup({ executionSpaceId: 'other-space' });

    const result = await callHandler(0);

    expect(result.status).toBe(404);
    expect(followExecution).not.toHaveBeenCalled();
  });

  it('checks that the user may converse in the conversation of the execution', async () => {
    const { getConversation, callReattach } = setup();

    await callReattach(0);

    expect(getConversation).toHaveBeenCalledWith('conv-1');
  });

  it('fails the stream without following the execution when the user cannot access the conversation', async () => {
    const error = createConversationNotFoundError({ conversationId: 'conv-1' });
    const { followExecution, callHandler } = setup({ conversationAccessError: error });

    const result = await callHandler(0);
    const [streamed] = mockObservableIntoEventSourceStream.mock.calls[0] as [Observable<unknown>];

    expect(result.status).toBe(200);
    await expect(firstValueFrom(streamed)).rejects.toBe(error);
    expect(followExecution).not.toHaveBeenCalled();
  });

  it('returns 404 without streaming for a standalone execution', async () => {
    const { followExecution, callHandler } = setup({
      executionMode: AgentExecutionMode.standalone,
    });

    const result = await callHandler(0);

    expect(result.status).toBe(404);
    expect(followExecution).not.toHaveBeenCalled();
  });

  it('applies the cloud proxy buffer size on cloud', async () => {
    const { callReattach } = setup({ cloudEnabled: true });

    const { options } = await callReattach(0);

    expect(options.flushMinBytes).toBe(4096);
  });
});
