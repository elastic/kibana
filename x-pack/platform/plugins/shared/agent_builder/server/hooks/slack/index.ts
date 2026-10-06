/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSlackProjection } from '@kbn/agent-builder-surfaces';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { InternalSetupServices } from '../../services';

export interface RegisterSlackHooksDeps {
  logger: Logger;
}

/**
 * Registers the hooks for rounds whose origin is Slack:
 * - afterChatEvent (blocking): adds the reply, rendered as Block Kit, to `round_complete` events.
 */
export const registerSlackHooks = (
  serviceSetups: InternalSetupServices,
  { logger }: RegisterSlackHooksDeps
): void => {
  serviceSetups.hooks.register({
    id: 'slack',
    hooks: {
      [HookLifecycle.afterChatEvent]: {
        mode: HookExecutionMode.blocking,
        handler: ({ event, execution }) => {
          const projected = addSlackProjection(event, {
            originType: execution.agentParams.origin?.type,
            logger,
          });

          return projected && { event: projected };
        },
      },
    },
  });
};
