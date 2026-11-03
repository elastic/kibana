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

export interface SaveSessionEventForRoundParams {
  context: AfterExecutionHookContext;
  getCoreStart: () => Promise<CoreStart>;
  getContextEngineStart: () => Promise<ContextEnginePluginStart>;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  logger: Logger;
}

/**
 * The round's author is stamped by Agent Builder for the posting user (or external system); the
 * request's user is the fallback for executions that carry no author.
 */
const resolveUserId = async ({
  context: { round, request },
  getCoreStart,
}: Pick<SaveSessionEventForRoundParams, 'context' | 'getCoreStart'>): Promise<
  string | undefined
> => {
  const author = round.author;
  if (author?.username || author?.id) {
    return author.username || author.id;
  }
  const coreStart = await getCoreStart();
  return coreStart.security.authc.getCurrentUser(request)?.username;
};

/**
 * After-execution hook body: records the completed round, serialized as-is, as a Context Engine
 * session event. The conversation is the session, the Kibana user is the user, and the executing
 * agent is the agent.
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
    logger.debug(
      `Skipping session event for round [${round.id}]: access [${context.conversationAccess}], conversation [${conversationId}], agent [${agentId}]`
    );
    return;
  }
  if (round.status !== ConversationRoundStatus.completed) {
    logger.debug(`Skipping session event for round [${round.id}]: status [${round.status}]`);
    return;
  }

  try {
    const contextEngine = await getContextEngineStart();
    if (!(await contextEngine.isMemoryEnabled(request))) {
      logger.debug(`Skipping session event for round [${round.id}]: memory is disabled`);
      return;
    }

    const userId = await resolveUserId({ context, getCoreStart });
    if (!userId) {
      logger.warn(
        `Skipping session event for round [${round.id}] of conversation [${conversationId}]: no author on the round and no authenticated user on the request`
      );
      return;
    }

    const space = resolveSpaceId(await getSpaces(), request);
    const saved = await contextEngine.getSessionEventsService().save({
      session_id: conversationId,
      user_id: userId,
      agent_id: agentId,
      round_id: round.id,
      space,
      // The round as Agent Builder produced it: no rendering, so nothing is lost or invented.
      transcript: JSON.stringify(round),
    });
    logger.debug(
      `Saved session event [${saved.id}] for round [${round.id}] of conversation [${conversationId}]`
    );
  } catch (error) {
    logger.warn(
      `Failed to save session event for round [${round.id}] of conversation [${conversationId}]: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
