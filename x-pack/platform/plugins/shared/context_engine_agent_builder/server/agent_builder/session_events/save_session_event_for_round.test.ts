/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { AfterExecutionHookContext } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  MAX_TRANSCRIPT_BYTES,
  saveSessionEventForRound,
  serializeRound,
} from './save_session_event_for_round';

const buildRound = (overrides: Partial<ConversationRound> = {}): ConversationRound =>
  ({
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: { message: 'What does the user prefer?' },
    steps: [],
    response: { message: 'Dark mode.' },
    started_at: '2026-01-01T00:00:00.000Z',
    time_to_first_token: 1,
    time_to_last_token: 2,
    model_usage: { connector_id: 'c-1', model: 'm', input_tokens: 0, output_tokens: 0 },
    ...overrides,
  } as ConversationRound);

const buildContext = (
  overrides: Partial<AfterExecutionHookContext> = {}
): AfterExecutionHookContext =>
  ({
    request: {},
    agentId: 'elastic-ai-agent',
    conversationId: 'conv-1',
    conversationAccess: 'readWrite',
    round: buildRound(),
    agentConfiguration: {},
    ...overrides,
  } as unknown as AfterExecutionHookContext);

describe('saveSessionEventForRound', () => {
  const setup = ({
    memoryEnabled = true,
    user = { username: 'kathleen' },
  }: { memoryEnabled?: boolean; user?: { username: string } | null } = {}) => {
    const core = coreMock.createStart();
    jest.mocked(core.security.authc.getCurrentUser).mockReturnValue(user as never);
    const save = jest.fn().mockResolvedValue({ id: 'e-1' });
    const contextEngine = {
      isMemoryEnabled: jest.fn().mockResolvedValue(memoryEnabled),
      getSessionEventsService: () => ({ save }),
    };
    const logger = loggingSystemMock.createLogger();
    const run = (context: AfterExecutionHookContext) =>
      saveSessionEventForRound({
        context,
        getCoreStart: async () => core as unknown as CoreStart,
        getContextEngineStart: async () => contextEngine as never,
        getSpaces: async () => undefined,
        logger,
      });
    return { run, save, logger, contextEngine };
  };

  it('saves the round verbatim as a session event scoped to the conversation, user, and agent', async () => {
    const { run, save } = setup();
    const round = buildRound();

    await run(buildContext({ round }));

    expect(save).toHaveBeenCalledWith({
      session_id: 'conv-1',
      user_id: 'kathleen',
      agent_id: 'elastic-ai-agent',
      round_id: 'round-1',
      space: 'default',
      transcript: JSON.stringify(round),
    });
    expect(JSON.parse(save.mock.calls[0][0].transcript)).toEqual(round);
  });

  it('skips read-only runs, rounds without a conversation, and incomplete rounds', async () => {
    const { run, save, contextEngine } = setup();

    await run(buildContext({ conversationAccess: 'readOnly' }));
    await run(buildContext({ conversationId: undefined }));
    await run(buildContext({ round: buildRound({ status: ConversationRoundStatus.inProgress }) }));

    expect(save).not.toHaveBeenCalled();
    expect(contextEngine.isMemoryEnabled).not.toHaveBeenCalled();
  });

  it('skips while memory is disabled', async () => {
    const { run, save } = setup({ memoryEnabled: false });

    await run(buildContext());

    expect(save).not.toHaveBeenCalled();
  });

  it('prefers the round author over the request user', async () => {
    const { run, save } = setup({ user: null });

    await run(
      buildContext({ round: buildRound({ author: { id: 'u-123', username: 'slack-kathleen' } }) })
    );

    expect(save).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'slack-kathleen' }));
  });

  it('skips with a warning without an author or an authenticated user', async () => {
    const { run, save, logger } = setup({ user: null });

    await run(buildContext());

    expect(save).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no author on the round'));
  });

  it('logs a warning and swallows save failures', async () => {
    const { run, save, logger } = setup();
    save.mockRejectedValue(new Error('boom'));

    await expect(run(buildContext())).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});

describe('serializeRound', () => {
  it('keeps a round under the cap intact', () => {
    const round = buildRound();

    expect(serializeRound(round)).toEqual({ transcript: JSON.stringify(round), cut: false });
  });

  it('cuts a round over the cap at the byte limit', () => {
    const round = buildRound({ response: { message: 'x'.repeat(MAX_TRANSCRIPT_BYTES + 10) } });

    const { transcript, cut } = serializeRound(round);

    expect(cut).toBe(true);
    expect(Buffer.byteLength(transcript, 'utf8')).toBe(MAX_TRANSCRIPT_BYTES);
  });
});
