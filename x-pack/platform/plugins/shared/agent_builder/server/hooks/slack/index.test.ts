/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationOriginType,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import {
  HookExecutionMode,
  HookLifecycle,
  type AfterChatEventHookContext,
  type HookHandler,
} from '@kbn/agent-builder-server';
import { loggerMock } from '@kbn/logging-mocks';
import { createRound } from '../../test_utils';
import type { InternalSetupServices, InternalStartServices } from '../../services';
import { registerSlackHooks } from '.';

const createRoundCompleteEvent = (message: string): RoundCompleteEvent => ({
  type: ChatEventType.roundComplete,
  data: {
    round: createRound({ response: { message } }),
    attachments: [
      {
        id: 'a1',
        type: 'text',
        current_version: 1,
        versions: [
          {
            version: 1,
            data: { content: 'Attached text' },
            created_at: '2026-10-06T00:00:00.000Z',
            content_hash: 'hash',
          },
        ],
      },
    ],
  },
});

const createContext = (
  event: RoundCompleteEvent,
  origin?: { type: ConversationOriginType }
): AfterChatEventHookContext => ({
  request: { headers: {} } as AfterChatEventHookContext['request'],
  execution: {
    executionId: 'execution-1',
    agentId: 'agent-1',
    spaceId: 'space-1',
    agentParams: { conversationId: 'conversation-1', origin },
  } as AfterChatEventHookContext['execution'],
  event,
});

const registerHandler = (toSpec?: jest.Mock) => {
  const register = jest.fn();
  const getTypeDefinition = jest.fn(() => ({ toSpec }));

  registerSlackHooks({ hooks: { register } } as unknown as InternalSetupServices, {
    getKibanaUrl: () => 'http://localhost:5601',
    getInternalServices: () =>
      ({ attachments: { getTypeDefinition } } as unknown as InternalStartServices),
    logger: loggerMock.create(),
  });

  const [[{ id, hooks }]] = register.mock.calls;
  const { mode, handler } = hooks[HookLifecycle.afterChatEvent];

  return {
    id,
    mode,
    handler: handler as HookHandler<HookLifecycle.afterChatEvent>,
    getTypeDefinition,
  };
};

describe('registerSlackHooks', () => {
  it('registers the Slack bundle with a blocking afterChatEvent hook', () => {
    const { id, mode } = registerHandler();

    expect(id).toBe('slack');
    expect(mode).toBe(HookExecutionMode.blocking);
  });

  it('renders attachments through the mapping of their type', async () => {
    const toSpec = jest.fn(() => ({
      type: 'view',
      body: [{ type: 'markdown', text: 'Mapped text' }],
    }));
    const { handler, getTypeDefinition } = registerHandler(toSpec);
    const event = createRoundCompleteEvent('<render_attachment id="a1" />');

    const result = await handler(createContext(event, { type: ConversationOriginType.Slack }));

    expect(getTypeDefinition).toHaveBeenCalledWith('text');
    expect(toSpec).toHaveBeenCalledWith(
      { content: 'Attached text' },
      expect.objectContaining({ version: 1 })
    );
    expect(JSON.stringify(result)).toContain('Mapped text');
  });

  it('links unmapped attachments to the conversation in its space', async () => {
    const { handler } = registerHandler();
    const event = createRoundCompleteEvent('<render_attachment id="a1" />');

    const result = await handler(createContext(event, { type: ConversationOriginType.Slack }));

    expect(JSON.stringify(result)).toContain(
      'http://localhost:5601/s/space-1/app/agent_builder/agents/agent-1/conversations/conversation-1'
    );
  });

  it('leaves events of rounds without an origin unchanged', async () => {
    const { handler } = registerHandler();

    expect(await handler(createContext(createRoundCompleteEvent('Hello')))).toBeUndefined();
  });
});
