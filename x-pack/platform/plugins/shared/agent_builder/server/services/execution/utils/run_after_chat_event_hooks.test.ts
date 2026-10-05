/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import {
  ChatEventType,
  ConversationOriginType,
  TimelineEventType,
  type ChatEvent,
  type MessageChunkEvent,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { HookLifecycle, type AfterChatEventHookContext } from '@kbn/agent-builder-server';
import type { ConversationAgentExecution } from '@kbn/agent-builder-server/execution';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createRound } from '../../../test_utils';
import { createHooksServiceStartMock } from '../../../test_utils/runner';
import { runAfterChatEventHooks } from './run_after_chat_event_hooks';

const roundCompleteEvent: RoundCompleteEvent = {
  type: ChatEventType.roundComplete,
  data: { round: createRound({}) },
};

const messageChunkEvent: MessageChunkEvent = {
  type: ChatEventType.messageChunk,
  data: { message_id: 'message-1', text_chunk: 'Hello' },
};

const executionStartedEvent = { type: TimelineEventType.executionStarted } as ChatEvent;

const projectedEvent: RoundCompleteEvent = {
  ...roundCompleteEvent,
  projection: { slack: { text: 'projected', blocks: [{ type: 'markdown', text: 'projected' }] } },
};

const execution = {
  executionId: 'execution-1',
  agentParams: { origin: { type: ConversationOriginType.Slack } },
} as ConversationAgentExecution;

const setup = ({ abortController = new AbortController() } = {}) => {
  const hooks = createHooksServiceStartMock();
  hooks.handles.mockImplementation(
    (_lifecycle, eventType) => eventType === ChatEventType.roundComplete
  );
  const logger = loggingSystemMock.createLogger();

  const run = (events: ChatEvent[]) =>
    lastValueFrom(
      of(...events).pipe(
        runAfterChatEventHooks({
          hooks,
          request: { headers: {} } as never,
          abortSignal: abortController.signal,
          execution,
          logger,
        }),
        toArray()
      )
    );

  return { hooks, logger, run, abortController };
};

describe('runAfterChatEventHooks', () => {
  it('lets event types no hook handles through without running hooks', async () => {
    const { hooks, run } = setup();

    const events = await run([executionStartedEvent, messageChunkEvent]);

    expect(events).toEqual([executionStartedEvent, messageChunkEvent]);
    expect(hooks.run).not.toHaveBeenCalled();
  });

  it('runs hooks on execution lifecycle events when a hook handles them', async () => {
    const { hooks, run } = setup();
    hooks.handles.mockReturnValue(true);

    await run([executionStartedEvent]);

    expect(hooks.run).toHaveBeenCalledWith(
      HookLifecycle.afterChatEvent,
      expect.objectContaining({ event: executionStartedEvent })
    );
  });

  it('runs hooks with the event and its execution, and emits the event they return', async () => {
    const { hooks, run } = setup();
    hooks.run.mockImplementation(async (_lifecycle, context) => ({
      ...context,
      event: projectedEvent,
    }));

    const events = await run([roundCompleteEvent]);

    expect(events).toEqual([projectedEvent]);
    expect(hooks.run).toHaveBeenCalledWith(
      HookLifecycle.afterChatEvent,
      expect.objectContaining({ event: roundCompleteEvent, execution })
    );
  });

  it('keeps event order when hooks resolve after the events that follow', async () => {
    const { hooks, run } = setup();
    hooks.run.mockImplementation(
      (_lifecycle, context) =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ ...(context as AfterChatEventHookContext), event: projectedEvent }),
            10
          )
        )
    );

    const events = await run([roundCompleteEvent, messageChunkEvent]);

    expect(events).toEqual([projectedEvent, messageChunkEvent]);
  });

  it('emits the original event and logs a warning when hooks fail', async () => {
    const { hooks, logger, run } = setup();
    hooks.run.mockRejectedValue(new Error('boom'));

    const events = await run([roundCompleteEvent]);

    expect(events).toEqual([roundCompleteEvent]);
    expect(logger.warn).toHaveBeenCalledWith(
      'afterChatEvent hooks failed on "round_complete" event: Error: boom'
    );
  });

  it('emits the original event without logging when the execution was aborted', async () => {
    const { hooks, logger, run, abortController } = setup();
    abortController.abort();
    hooks.run.mockRejectedValue(new Error('aborted'));

    const events = await run([roundCompleteEvent]);

    expect(events).toEqual([roundCompleteEvent]);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
