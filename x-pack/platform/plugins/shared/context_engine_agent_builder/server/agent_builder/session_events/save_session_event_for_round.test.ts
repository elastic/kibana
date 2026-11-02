/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { AfterExecutionHookContext } from '@kbn/agent-builder-server';
import type { CoreStart } from '@kbn/core/server';
import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { buildRound } from './build_round_transcript.test';
import { saveSessionEventForRound } from './save_session_event_for_round';

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

  it('saves the completed round as a session event scoped to the conversation, user, and agent', async () => {
    const { run, save } = setup();

    await run(buildContext());

    expect(save).toHaveBeenCalledWith({
      session_id: 'conv-1',
      user_id: 'kathleen',
      agent_id: 'elastic-ai-agent',
      round_id: 'round-1',
      space: 'default',
      transcript: 'user: What does the user prefer?\nagent: Dark mode.',
    });
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

  it('skips without an authenticated user', async () => {
    const { run, save } = setup({ user: null });

    await run(buildContext());

    expect(save).not.toHaveBeenCalled();
  });

  it('logs a warning and swallows save failures', async () => {
    const { run, save, logger } = setup();
    save.mockRejectedValue(new Error('boom'));

    await expect(run(buildContext())).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
