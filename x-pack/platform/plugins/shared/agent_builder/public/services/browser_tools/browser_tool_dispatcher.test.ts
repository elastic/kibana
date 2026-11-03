/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { BrowserToolDefinition } from '@kbn/agent-builder-browser/tools/browser_tool';
import type { BrowserToolCallEvent, BrowserToolResultPayload } from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import { BrowserToolRegistry } from './browser_tool_registry';
import { createPageScheduler } from './page_scheduler';
import { BrowserToolDispatcher, type DispatchContext } from './browser_tool_dispatcher';

const START = Date.parse('2026-11-03T10:00:00.000Z');

const createEvent = (
  overrides: Partial<BrowserToolCallEvent['data']> = {}
): BrowserToolCallEvent => ({
  type: ChatEventType.browserToolCall,
  data: {
    tool_call_id: 'call-1',
    tool_id: 'my_tool',
    params: {},
    expires_at: new Date(START + 60_000).toISOString(),
    ...overrides,
  },
});

interface PostedResult {
  executionId: string;
  toolCallId: string;
  clientId?: string;
  result: BrowserToolResultPayload;
}

describe('BrowserToolDispatcher', () => {
  let registry: BrowserToolRegistry;
  let posted: PostedResult[];
  let postBrowserToolResult: jest.Mock;
  let addDanger: jest.Mock;
  let dispatcher: BrowserToolDispatcher;
  let context: DispatchContext;

  const register = <T>(
    handler: BrowserToolDefinition<T>['handler'],
    id: string = 'my_tool',
    schema: z.ZodType<T> = z.object({}) as unknown as z.ZodType<T>
  ) => registry.register({ id, description: 'test', schema, handler });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START);
    registry = new BrowserToolRegistry();
    posted = [];
    postBrowserToolResult = jest.fn(async (params: PostedResult) => {
      posted.push(params);
      return 'accepted' as const;
    });
    addDanger = jest.fn();
    dispatcher = new BrowserToolDispatcher({
      registry,
      chatService: { postBrowserToolResult },
      scheduler: createPageScheduler(),
      toasts: { addDanger } as never,
    });
    context = {
      clientId: 'client-1',
      executionId: 'exec-1',
      conversationId: 'conv-1',
      agentId: 'agent-1',
      streamSignal: new AbortController().signal,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores events addressed to another client', async () => {
    const handler = jest.fn();
    register(handler);

    dispatcher.dispatch(createEvent({ client_id: 'other-client' }), context);
    await jest.advanceTimersByTimeAsync(0);

    expect(handler).not.toHaveBeenCalled();
    expect(posted).toEqual([]);
  });

  it('runs the handler and posts an ok result with content', async () => {
    const handler = jest.fn(async (params: { q: string }) => ({
      content: { echoed: params.q },
      images: [{ mimeType: 'image/png' as const, base64: 'AAA', name: 'shot' }],
    }));
    register(handler, 'my_tool', z.object({ q: z.string() }));

    dispatcher.dispatch(createEvent({ params: { q: 'hello' }, client_id: 'client-1' }), context);
    await jest.advanceTimersByTimeAsync(0);

    expect(handler).toHaveBeenCalledWith(
      { q: 'hello' },
      expect.objectContaining({
        toolId: 'my_tool',
        toolCallId: 'call-1',
        executionId: 'exec-1',
        conversationId: 'conv-1',
        agentId: 'agent-1',
      })
    );
    expect(posted).toEqual([
      {
        executionId: 'exec-1',
        toolCallId: 'call-1',
        clientId: 'client-1',
        result: {
          status: 'ok',
          content: { echoed: 'hello' },
          images: [{ mime_type: 'image/png', base64: 'AAA', name: 'shot' }],
        },
      },
    ]);
    expect(addDanger).not.toHaveBeenCalled();
  });

  it('maps a void return to status ok', async () => {
    register(() => {});

    dispatcher.dispatch(createEvent(), context);
    await jest.advanceTimersByTimeAsync(0);

    expect(posted.map((p) => p.result)).toEqual([{ status: 'ok' }]);
  });

  it('posts an error result and shows a danger toast when the handler throws', async () => {
    register(() => {
      throw new Error('boom');
    });

    dispatcher.dispatch(createEvent(), context);
    await jest.advanceTimersByTimeAsync(0);

    expect(posted.map((p) => p.result)).toEqual([{ status: 'error', message: 'boom' }]);
    expect(addDanger).toHaveBeenCalledWith({
      title: 'Browser tool "my_tool" failed',
      text: 'boom',
    });
  });

  it('posts an error result when the tool is unknown', async () => {
    dispatcher.dispatch(createEvent({ tool_id: 'missing_tool' }), context);
    await jest.advanceTimersByTimeAsync(0);

    expect(posted.map((p) => p.result)).toEqual([
      { status: 'error', message: 'unknown browser tool "missing_tool"' },
    ]);
  });

  it("posts an 'expired before execution' error without running the handler when expires_at has passed", async () => {
    const handler = jest.fn();
    register(handler);

    dispatcher.dispatch(createEvent({ expires_at: new Date(START - 1).toISOString() }), context);
    await jest.advanceTimersByTimeAsync(0);

    expect(handler).not.toHaveBeenCalled();
    expect(posted.map((p) => p.result)).toEqual([
      { status: 'error', message: 'expired before execution' },
    ]);
  });

  it('aborts the signal and posts an error when the handler outlives expires_at, then runs the next call', async () => {
    let firstSignal: AbortSignal | undefined;
    const order: string[] = [];
    register((_params, { toolCallId, signal }) => {
      order.push(`start:${toolCallId}`);
      if (toolCallId === 'call-1') {
        firstSignal = signal;
        // never settles
        return new Promise<void>(() => {});
      }
      return { content: 'second' };
    });

    dispatcher.dispatch(
      createEvent({ tool_call_id: 'call-1', expires_at: new Date(START + 1_000).toISOString() }),
      context
    );
    dispatcher.dispatch(
      createEvent({ tool_call_id: 'call-2', expires_at: new Date(START + 60_000).toISOString() }),
      context
    );

    await jest.advanceTimersByTimeAsync(0);
    expect(order).toEqual(['start:call-1']);
    expect(firstSignal?.aborted).toBe(false);
    expect(posted).toEqual([]);

    await jest.advanceTimersByTimeAsync(1_000);

    expect(firstSignal?.aborted).toBe(true);
    expect(order).toEqual(['start:call-1', 'start:call-2']);
    expect(posted.map((p) => [p.toolCallId, p.result])).toEqual([
      ['call-1', { status: 'error', message: expect.stringContaining('expired') }],
      ['call-2', { status: 'ok', content: 'second' }],
    ]);
  });

  it('does not re-run a completed call and re-posts its cached result', async () => {
    const handler = jest.fn(() => ({ content: 'done' }));
    register(handler);

    dispatcher.dispatch(createEvent(), context);
    await jest.advanceTimersByTimeAsync(0);

    postBrowserToolResult.mockImplementationOnce(async (params: PostedResult) => {
      posted.push(params);
      return 'final' as const;
    });
    dispatcher.dispatch(createEvent(), context);
    await jest.advanceTimersByTimeAsync(0);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(posted.map((p) => p.result)).toEqual([
      { status: 'ok', content: 'done' },
      { status: 'ok', content: 'done' },
    ]);
  });

  it('runs overlapping calls one at a time in arrival order', async () => {
    const order: string[] = [];
    register(async (_params, { toolCallId }) => {
      order.push(`start:${toolCallId}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      order.push(`end:${toolCallId}`);
      return { content: toolCallId };
    });

    // second dispatcher sharing the same page scheduler, as another conversation surface would
    const scheduler = createPageScheduler();
    const first = new BrowserToolDispatcher({
      registry,
      chatService: { postBrowserToolResult },
      scheduler,
    });
    const second = new BrowserToolDispatcher({
      registry,
      chatService: { postBrowserToolResult },
      scheduler,
    });

    first.dispatch(createEvent({ tool_call_id: 'a' }), context);
    second.dispatch(createEvent({ tool_call_id: 'b' }), { ...context, executionId: 'exec-2' });
    first.dispatch(createEvent({ tool_call_id: 'c' }), context);

    await jest.advanceTimersByTimeAsync(50);
    expect(order).toEqual(['start:a']);

    await jest.advanceTimersByTimeAsync(300);
    expect(order).toEqual(['start:a', 'end:a', 'start:b', 'end:b', 'start:c', 'end:c']);
    expect(posted.map((p) => [p.executionId, p.toolCallId])).toEqual([
      ['exec-1', 'a'],
      ['exec-2', 'b'],
      ['exec-1', 'c'],
    ]);
  });
});
