/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { saveSessionEventForRound } from './save_session_event_for_round';
import type { SaveSessionEventForRoundParams } from './save_session_event_for_round';

export const SESSION_EVENTS_HOOK_ID = 'context-engine-session-events';

type HookDeps = Omit<SaveSessionEventForRoundParams, 'context' | 'logger'>;

/**
 * Registers the non-blocking after-execution hook that turns every completed Agent Builder round
 * into a Context Engine session event, so transcripts are persisted by the runtime rather than by
 * the agent or the user.
 */
export const registerSessionEventsHook = ({
  agentBuilder,
  logger,
  ...deps
}: HookDeps & { agentBuilder: AgentBuilderPluginSetup; logger: Logger }): void => {
  const hookLogger = logger.get('session_events');
  agentBuilder.hooks.register({
    id: SESSION_EVENTS_HOOK_ID,
    hooks: {
      [HookLifecycle.afterExecution]: {
        mode: HookExecutionMode.nonBlocking,
        handler: (context) => saveSessionEventForRound({ context, logger: hookLogger, ...deps }),
      },
    },
  });
};
