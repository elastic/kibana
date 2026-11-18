/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import {
  HookExecutionMode,
  HookLifecycle,
  type AgentBuilderPluginSetup,
} from '@kbn/agent-builder-server';
import { takesMemories } from '@kbn/context-engine-plugin/common/memory';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import { isContextEngineEnabledInSpace } from '@kbn/context-engine-plugin/server/utils/is_context_engine_enabled_in_space';
import { resolveSpaceId } from '@kbn/context-engine-plugin/server/utils/resolve_space_id';
import { CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type {
  ContextEngineAgentBuilderPluginStart,
  ContextEngineAgentBuilderStartDependencies,
} from '../types';
import { roundToSessionEvents } from './round_to_session_events';

export const SESSION_EVENTS_RECORDER_HOOK_ID = 'context-engine-session-events-recorder';

const memoryAiIndexIds = async ({
  contextEngine,
  aiIndexIds,
  space,
  logger,
}: {
  contextEngine: ContextEnginePluginStart;
  aiIndexIds: readonly string[];
  space: string;
  logger: Logger;
}): Promise<string[]> => {
  const aiIndexService = contextEngine.getAiIndexService();
  const found = await Promise.all(
    aiIndexIds.map((id) =>
      aiIndexService.get(id, space).then(
        (aiIndex) => (takesMemories(aiIndex) ? [id] : []),
        (error) => {
          logger.debug(`Skipping AI index [${id}] for session events: ${error.message}`);
          return [];
        }
      )
    )
  );
  return found.flat();
};

/**
 * Demo only: saves every Agent Builder round as session events, after it runs and without holding
 * it up. Runs only while Context Engine and memory are on, and never fails the round.
 */
export const registerSessionEventsRecorder = ({
  agentBuilder,
  coreSetup,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  coreSetup: CoreSetup<
    ContextEngineAgentBuilderStartDependencies,
    ContextEngineAgentBuilderPluginStart
  >;
  logger: Logger;
}): void => {
  const isMemoryOn = async (request: KibanaRequest, space: string): Promise<boolean> => {
    const [coreStart] = await coreSetup.getStartServices();
    const { savedObjects, uiSettings } = coreStart;
    if (!(await isContextEngineEnabledInSpace({ savedObjects, uiSettings, spaceId: space }))) {
      return false;
    }
    const globalSettings = uiSettings.globalAsScopedToClient(savedObjects.getScopedClient(request));
    return (await globalSettings.get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID)) ?? false;
  };

  agentBuilder.hooks.register({
    id: SESSION_EVENTS_RECORDER_HOOK_ID,
    hooks: {
      [HookLifecycle.afterExecution]: {
        mode: HookExecutionMode.nonBlocking,
        handler: async ({
          conversationId,
          conversationAccess,
          round,
          request,
          agentConfiguration,
        }) => {
          if (!conversationId || conversationAccess === 'readOnly') {
            return;
          }
          try {
            const [coreStart, { contextEngine, spaces }] = await coreSetup.getStartServices();
            const space = resolveSpaceId(spaces, request);
            if (!(await isMemoryOn(request, space))) {
              return;
            }
            const userId = await coreStart.userProfile.getCurrentProfileId({ request });
            if (!userId) {
              logger.debug(`Not saving session events for [${conversationId}]: no user profile`);
              return;
            }

            const { results } = await contextEngine.getSessionEventsService().saveEvents(
              { space, userId },
              {
                sessionId: conversationId,
                aiIndexIds: await memoryAiIndexIds({
                  contextEngine,
                  aiIndexIds: agentConfiguration.ai_indices ?? [],
                  space,
                  logger,
                }),
                events: roundToSessionEvents(round),
              }
            );
            const failed = results.filter(({ status }) => status === 'failed');
            if (failed.length > 0) {
              logger.warn(
                `Failed to save ${failed.length} session events for [${conversationId}]: ${
                  'error' in failed[0] ? failed[0].error : 'unknown error'
                }`
              );
            }
          } catch (error) {
            logger.warn(
              `Failed to save session events for [${conversationId}]: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        },
      },
    },
  });
};
