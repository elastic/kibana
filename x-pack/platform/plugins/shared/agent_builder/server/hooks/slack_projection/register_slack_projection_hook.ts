/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatEventType } from '@kbn/agent-builder-common';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { InternalSetupServices } from '../../services';
import { addSlackProjection } from './add_slack_projection';

/**
 * Registers a blocking afterChatEvent hook that adds the Slack payload of the reply to
 * `round_complete` events of Slack rounds.
 */
export const registerSlackProjectionHook = (serviceSetups: InternalSetupServices): void => {
  serviceSetups.hooks.register({
    id: 'slack-projection',
    hooks: {
      [HookLifecycle.afterChatEvent]: {
        mode: HookExecutionMode.blocking,
        eventTypes: [ChatEventType.roundComplete],
        handler: addSlackProjection,
      },
    },
  });
};
