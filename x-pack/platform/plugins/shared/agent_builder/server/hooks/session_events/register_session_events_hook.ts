/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  ConversationRoundStatus,
  isSharedConversation,
  isUserProfileId,
} from '@kbn/agent-builder-common';
import { HookExecutionMode, HookLifecycle } from '@kbn/agent-builder-server';
import type { AfterExecutionHookContext } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { InternalSetupServices, InternalStartServices } from '../../services';
import { getUserFromRequest } from '../../services/utils';
import type { AgentBuilderStartDependencies } from '../../types';
import { getCurrentSpaceId } from '../../utils/spaces';
import { roundToSessionEvents } from './round_to_session_events';

export interface RegisterSessionEventsHookDeps {
  logger: Logger;
  getInternalServices: () => InternalStartServices;
  getStartServices: CoreSetup<AgentBuilderStartDependencies>['getStartServices'];
}

const saveRound = async (
  context: AfterExecutionHookContext,
  { getInternalServices, getStartServices, logger }: RegisterSessionEventsHookDeps
): Promise<void> => {
  const { conversationId, conversationAccess, round, agentConfiguration, request } = context;

  // Only `readWrite` runs store the round: this excludes read-only and ephemeral workflow runs.
  if (!conversationId || conversationAccess !== 'readWrite') {
    return;
  }
  if (round.status !== ConversationRoundStatus.completed) {
    return;
  }
  const aiIndexIds = agentConfiguration.ai_indices ?? [];
  if (aiIndexIds.length === 0) {
    return;
  }

  const { uiSettings, savedObjects, spaces, conversations } = getInternalServices();
  const experimentalFeaturesEnabled = await uiSettings
    .asScopedToClient(savedObjects.getScopedClient(request))
    .get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
  if (!experimentalFeaturesEnabled) {
    return;
  }

  const [{ security, elasticsearch }, { contextEngine }] = await getStartServices();
  if (!contextEngine) {
    return;
  }

  const user = await getUserFromRequest({
    request,
    security,
    esClient: elasticsearch.client.asScoped(request).asCurrentUser,
  });
  if (!isUserProfileId(user.id)) {
    return;
  }

  const conversationClient = await conversations.getScopedClientAsUser({ request, user });
  const conversation = await conversationClient.get(conversationId);
  if (isSharedConversation(conversation.access_control)) {
    return;
  }

  const sessionEventsService = contextEngine.getSessionEventsService();
  const space = getCurrentSpaceId({ request, spaces });

  const { results } = await sessionEventsService.saveEvents(
    { space, userId: user.id },
    { sessionId: conversationId, aiIndexIds, events: roundToSessionEvents(round) }
  );

  const failedCount = results.filter(({ status }) => status === 'failed').length;
  if (failedCount > 0) {
    logger.warn(
      `Failed to save ${failedCount} of ${results.length} session events for conversation [${conversationId}]`
    );
  }
};

/** Registers the after-execution hook that saves each completed round to Context Engine. */
export const registerSessionEventsHook = (
  serviceSetups: InternalSetupServices,
  deps: RegisterSessionEventsHookDeps
): void => {
  const logger = deps.logger.get('sessionEvents');

  serviceSetups.hooks.register({
    id: 'session-events',
    hooks: {
      [HookLifecycle.afterExecution]: {
        mode: HookExecutionMode.nonBlocking,
        handler: async (context) => {
          try {
            await saveRound(context, { ...deps, logger });
          } catch (error) {
            logger.warn(
              `Failed to save session events for conversation [${context.conversationId}]: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        },
      },
    },
  });
};
