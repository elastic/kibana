/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import { internalApiPath } from '../../../common/constants';
import { registerInternalBrowserToolResultRoutes } from './browser_tool_results';

const path = `${internalApiPath}/executions/{executionId}/browser_tool_results/{toolCallId}`;

interface RouteConfig {
  path: string;
  options?: { body?: { maxBytes?: number } };
}

const setup = ({
  executionSpaceId = 'default' as string | null,
  owner = { id: 'user-1', username: 'alice' } as { id?: string; username: string },
  user = { id: 'user-1', username: 'alice' } as { id?: string; username: string },
  answerOutcome = 'accepted' as 'accepted' | 'not_found' | 'rejected',
} = {}) => {
  const routes: Record<string, { config: RouteConfig; handler: Function }> = {};
  const register = (config: RouteConfig, handler: Function) => {
    routes[config.path] = { config, handler };
  };
  const getExecution = jest.fn().mockResolvedValue(
    executionSpaceId === null
      ? undefined
      : {
          executionId: 'exec-1',
          spaceId: executionSpaceId,
          executionMode: AgentExecutionMode.conversation,
          owner,
          agentParams: { conversationId: 'conv-1' },
        }
  );
  const getConversation = jest.fn().mockResolvedValue({ id: 'conv-1' });
  const getScopedClient = jest.fn().mockResolvedValue({
    getUser: () => user,
    get: getConversation,
  });
  const answer = jest.fn().mockResolvedValue(answerOutcome);

  registerInternalBrowserToolResultRoutes({
    router: { post: register },
    getInternalServices: () => ({
      execution: { getExecution },
      conversations: { getScopedClient },
      browserTools: { callClient: { answer } },
    }),
    coreSetup: {},
    logger: loggingSystemMock.createLogger(),
  } as never);

  const result = { status: 'ok', content: 'done' };
  const callHandler = () =>
    routes[path].handler(
      {
        licensing: Promise.resolve({ license: { status: 'active', hasAtLeast: () => true } }),
        agentBuilder: Promise.resolve({ spaces: { getSpaceId: () => 'default' } }),
      },
      {
        params: { executionId: 'exec-1', toolCallId: 'call-1' },
        body: { client_id: 'client-1', result },
      },
      {
        noContent: () => ({ status: 204 }),
        notFound: ({ body }: { body: unknown }) => ({ status: 404, payload: body }),
        forbidden: ({ body }: { body: unknown }) => ({ status: 403, payload: body }),
        conflict: ({ body }: { body: unknown }) => ({ status: 409, payload: body }),
      }
    );

  return { routes, answer, getConversation, callHandler, result };
};

describe('POST /internal/agent_builder/executions/{executionId}/browser_tool_results/{toolCallId}', () => {
  it('accepts large bodies for screenshots', () => {
    const { routes } = setup();
    expect(routes[path].config.options?.body?.maxBytes).toBe(8 * 1024 * 1024);
  });

  it('returns 204 and writes the answer for the owner with a matching client id', async () => {
    const { callHandler, answer, getConversation, result } = setup();

    expect(await callHandler()).toEqual({ status: 204 });
    expect(getConversation).toHaveBeenCalledWith('conv-1');
    expect(answer).toHaveBeenCalledWith({
      executionId: 'exec-1',
      toolCallId: 'call-1',
      clientId: 'client-1',
      result,
    });
  });

  it('returns 403 for a user who is not the execution owner', async () => {
    const { callHandler, answer } = setup({ user: { id: 'user-2', username: 'bob' } });

    expect(await callHandler()).toMatchObject({ status: 403 });
    expect(answer).not.toHaveBeenCalled();
  });

  it('falls back to the username when the owner has no id', async () => {
    const owned = setup({ owner: { username: 'alice' }, user: { id: 'u', username: 'alice' } });
    expect(await owned.callHandler()).toEqual({ status: 204 });

    const other = setup({ owner: { username: 'alice' }, user: { id: 'u', username: 'bob' } });
    expect(await other.callHandler()).toMatchObject({ status: 403 });
  });

  it('returns 404 when the execution is in another space', async () => {
    const { callHandler, answer } = setup({ executionSpaceId: 'other' });

    expect(await callHandler()).toMatchObject({ status: 404 });
    expect(answer).not.toHaveBeenCalled();
  });

  it('returns 404 when the call document does not exist', async () => {
    const { callHandler } = setup({ answerOutcome: 'not_found' });

    expect(await callHandler()).toMatchObject({ status: 404 });
  });

  it('returns 409 when the call is not pending', async () => {
    const { callHandler } = setup({ answerOutcome: 'rejected' });

    expect(await callHandler()).toMatchObject({ status: 409 });
  });
});
