/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationOriginType,
  isRoundCompleteEvent,
  type SlackPayload,
} from '@kbn/agent-builder-common';
import { HookLifecycle, HookExecutionMode, type HookHandler } from '@kbn/agent-builder-server';
import type { InternalSetupServices } from '../../services';

/**
 * Turns a reply into a raw Slack payload, keeping the message text as is.
 */
const buildSlackPayload = (message: string): SlackPayload => ({
  text: message,
  blocks: [{ type: 'markdown', text: message }],
});

/**
 * Adds the Slack payload of the reply to `round_complete` events of Slack rounds.
 */
export const addSlackProjection: HookHandler<HookLifecycle.afterChatEvent> = ({
  event,
  execution,
}) => {
  if (
    execution.agentParams.origin?.type !== ConversationOriginType.Slack ||
    !isRoundCompleteEvent(event)
  ) {
    return;
  }

  const { message } = event.data.round.response;
  if (!message) {
    return;
  }

  return {
    event: { ...event, projection: { ...event.projection, slack: buildSlackPayload(message) } },
  };
};

/**
 * Registers the hooks for rounds whose origin is Slack:
 * - afterChatEvent (blocking): adds the Slack payload of the reply to `round_complete` events.
 */
export const registerSlackHooks = (serviceSetups: InternalSetupServices): void => {
  serviceSetups.hooks.register({
    id: 'slack',
    hooks: {
      [HookLifecycle.afterChatEvent]: {
        mode: HookExecutionMode.blocking,
        handler: addSlackProjection,
      },
    },
  });
};
