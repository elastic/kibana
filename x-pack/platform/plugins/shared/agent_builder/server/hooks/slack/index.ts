/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import { addSlackProjection } from '@kbn/agent-builder-surfaces';
import { HookLifecycle, HookExecutionMode } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { AGENTBUILDER_PATH } from '../../../common/features';
import type { InternalSetupServices, InternalStartServices } from '../../services';

export interface RegisterSlackHooksDeps {
  /** Base URL of Kibana, without a space. */
  getKibanaUrl: () => string;
  getInternalServices: () => InternalStartServices;
  logger: Logger;
}

/**
 * Registers the hooks for rounds whose origin is Slack:
 * - afterChatEvent (blocking): adds the reply, rendered as Block Kit, to `round_complete` events.
 */
export const registerSlackHooks = (
  serviceSetups: InternalSetupServices,
  { getKibanaUrl, getInternalServices, logger }: RegisterSlackHooksDeps
): void => {
  serviceSetups.hooks.register({
    id: 'slack',
    hooks: {
      [HookLifecycle.afterChatEvent]: {
        mode: HookExecutionMode.blocking,
        handler: ({ event, execution }) => {
          const { agentId, spaceId, agentParams } = execution;
          const conversationPath = `${AGENTBUILDER_PATH}/agents/${agentId}/conversations/${agentParams.conversationId}`;

          const projected = addSlackProjection(event, {
            originType: agentParams.origin?.type,
            getMapping: (type) => getInternalServices().attachments.getTypeDefinition(type)?.toSpec,
            getConversationUrl: () =>
              `${addSpaceIdToPath(getKibanaUrl(), spaceId)}${conversationPath}`,
            logger,
          });

          return projected && { event: projected };
        },
      },
    },
  });
};
