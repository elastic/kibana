/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus } from '@kbn/agent-builder-common';
import type { AfterExecutionHookContext } from '@kbn/agent-builder-server';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/server';
import { resolveSpaceId } from '@kbn/context-engine-plugin/server/utils/resolve_space_id';
import type { CoreStart, Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { buildRoundTranscript } from './build_round_transcript';

export interface SaveSessionEventForRoundParams {
  context: AfterExecutionHookContext;
  getCoreStart: () => Promise<CoreStart>;
  getContextEngineStart: () => Promise<ContextEnginePluginStart>;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  logger: Logger;
}

/**
 * After-execution hook body: records the completed round as a Context Engine session event. The
 * conversation is the session, the Kibana user is the user, and the executing agent is the agent.
 * Skipped for runs that never join a conversation and while the memory feature is off. Failures
 * are logged, never surfaced to the conversation.
 */
export const saveSessionEventForRound = async ({
  context,
  getCoreStart,
  getContextEngineStart,
  getSpaces,
  logger,
}: SaveSessionEventForRoundParams): Promise<void> => {
  const { request, round, conversationId, agentId } = context;

  // The round never lands in a conversation, so there is no session to attach it to.
  if (context.conversationAccess === 'readOnly' || !conversationId || !agentId) {
    return;
  }
  if (round.status !== ConversationRoundStatus.completed) {
    return;
  }

  try {
    const contextEngine = await getContextEngineStart();
    if (!(await contextEngine.isMemoryEnabled(request))) {
      return;
    }

    const coreStart = await getCoreStart();
    const user = coreStart.security.authc.getCurrentUser(request);
    if (!user) {
      logger.debug(`Skipping session event for round [${round.id}]: no authenticated user`);
      return;
    }

    const space = resolveSpaceId(await getSpaces(), request);
    await contextEngine.getSessionEventsService().save({
      session_id: conversationId,
      user_id: user.username,
      agent_id: agentId,
      round_id: round.id,
      space,
      transcript: buildRoundTranscript(round),
    });
  } catch (error) {
    logger.warn(
      `Failed to save session event for round [${round.id}] of conversation [${conversationId}]: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
