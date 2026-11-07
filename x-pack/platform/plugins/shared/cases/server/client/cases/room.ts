/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { v4 as uuidv4 } from 'uuid';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  type ConversationAccessControlInput,
} from '@kbn/agent-builder-common';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { COMMENT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { ActionSource, Case } from '../../../common/types/domain';
import { ActionSourceTypes, CaseAccessMode } from '../../../common/types/domain';
import { createCaseError } from '../../common/error';
import { Operations } from '../../authorization';
import type { CasesClient, CasesClientArgs } from '..';
import * as i18n from './translations';

export const ROOM_AGENT_NAME = 'Elastic AI Agent';

export interface CaseRoomResponse {
  conversation_id: string;
  created: boolean;
}

export interface PostFromRoomRequest {
  /** The room timeline event: a person's message, or the agent's finished reply. */
  event_id: string;
}

interface RoomEvent {
  id: string;
  type: string;
  actor?: { type?: string; username?: string; full_name?: string };
  data?: {
    message?: string;
    outcome?: { type?: string; response?: { message?: string } };
  };
}

/** A person's message in the room, or the agent's reply when its run finished with an answer. */
export const getRoomMessage = (
  event: RoomEvent
): { kind: 'person' | 'agent'; text: string; author?: string } | undefined => {
  if (event.type === 'user_message' && event.data?.message) {
    return {
      kind: 'person',
      text: event.data.message,
      author: event.actor?.full_name || event.actor?.username,
    };
  }
  if (
    event.type === 'execution_terminated' &&
    event.data?.outcome?.type === 'responded' &&
    event.data.outcome.response?.message
  ) {
    return { kind: 'agent', text: event.data.outcome.response.message };
  }
  return undefined;
};

/** The case is authoritative for who can use its room, the same rule as its linked investigations. */
export const getRoomAccessControl = (theCase: Case): Required<ConversationAccessControlInput> =>
  theCase.access?.mode === CaseAccessMode.RESTRICTED
    ? {
        access_mode: ConversationAccessControlMode.Private,
        entries: theCase.assignees.map(({ uid }) => ({
          type: 'user' as const,
          id: uid,
          role: ConversationAccessControlRole.Member,
        })),
      }
    : { access_mode: ConversationAccessControlMode.Public, entries: [] };

const isSameAccess = (
  current: { access_mode?: string; entries?: Array<{ id: string }> } | undefined,
  wanted: Required<ConversationAccessControlInput>
) => {
  if (!current || current.access_mode !== wanted.access_mode) return false;
  const have = new Set((current.entries ?? []).map(({ id }) => id));
  const want = new Set(wanted.entries.map(({ id }) => id));
  return have.size === want.size && [...want].every((id) => have.has(id));
};

const getAgentBuilderOrThrow = (clientArgs: CasesClientArgs) => {
  if (!clientArgs.agentBuilder || !clientArgs.config.agentic.enabled) {
    throw Boom.notFound('The case room is not available.');
  }
  return clientArgs.agentBuilder;
};

/**
 * Applies the case's access to its room. The write is owner-level and skips Agent Builder's own
 * check, so it only ever sets the value derived from the case, and only on the conversation the
 * case recorded as its room.
 */
export const syncRoomAccess = async (theCase: Case, clientArgs: CasesClientArgs) => {
  if (!theCase.room_conversation_id || !clientArgs.agentBuilder) return;
  const conversations = await clientArgs.agentBuilder.conversations.getScopedClient({
    request: clientArgs.request,
  });
  await conversations.updateAccessControlAsOwner(
    theCase.room_conversation_id,
    getRoomAccessControl(theCase)
  );
};

/**
 * The person who opened the room owns its conversation, and Agent Builder always lets an owner in.
 * Keeping them assigned keeps that owner inside the case's own access, so a restricted case never
 * leaves someone in its room who can't see the case.
 */
export const throwIfUnassigningRoomOwner = async (
  casesToUpdate: Array<{
    updateReq: { id: string; assignees?: Array<{ uid: string }> };
    originalCase: { attributes: { room_owner_uid?: string | null; title: string } };
  }>,
  /** Resolves the owner's display name for the message; the message reads without it too. */
  getDisplayName: (uid: string) => Promise<string | undefined> = async () => undefined
) => {
  for (const { updateReq, originalCase } of casesToUpdate) {
    const owner = originalCase.attributes.room_owner_uid;
    if (owner && updateReq.assignees && !updateReq.assignees.some(({ uid }) => uid === owner)) {
      const name = await getDisplayName(owner).catch(() => undefined);
      throw Boom.badRequest(
        name
          ? i18n.ROOM_OWNER_STAYS_ASSIGNED(name, originalCase.attributes.title)
          : i18n.ROOM_OWNER_STAYS_ASSIGNED_UNNAMED(originalCase.attributes.title)
      );
    }
  }
};

/**
 * Returns the case's room, creating it the first time. The room is an Agent Builder conversation
 * recorded on the case as `room_conversation_id`. Two people opening it at once both create one;
 * the case's version decides which is kept and the other is deleted.
 */
export const ensureRoom = async (
  { caseId }: { caseId: string },
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<CaseRoomResponse> => {
  const { logger, services } = clientArgs;
  try {
    const agentBuilder = getAgentBuilderOrThrow(clientArgs);
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    const conversations = await agentBuilder.conversations.getScopedClient({
      request: clientArgs.request,
    });
    const wanted = getRoomAccessControl(theCase);

    if (theCase.room_conversation_id) {
      const existing = (await conversations.bulkGet([theCase.room_conversation_id])).get(
        theCase.room_conversation_id
      );
      if (existing) {
        if (!isSameAccess(existing.access_control, wanted)) {
          await syncRoomAccess(theCase, clientArgs);
        }
        return { conversation_id: existing.id, created: false };
      }
      // Recorded but unreadable: either deleted, or the viewer isn't in it yet because a change to
      // the case's access hasn't reached the room. Re-applying the case's access fixes the second.
      try {
        await syncRoomAccess(theCase, clientArgs);
        return { conversation_id: theCase.room_conversation_id, created: false };
      } catch (error) {
        logger.debug(`Room of case ${caseId} is gone; creating a new one: ${error}`);
      }
    }

    // Creating the room writes to the case, so it needs Cases update; readers wait for a writer.
    await clientArgs.authorization.ensureAuthorized({
      operation: Operations.updateCase,
      entities: [{ id: theCase.id, owner: theCase.owner }],
    });

    const created = await conversations.create({
      id: uuidv4(),
      title: i18n.ROOM_TITLE(theCase.title),
      accessControl: wanted,
    });

    // The version check makes the first writer win: a writer that lost the race deletes its
    // conversation and uses the recorded one, rather than overwriting it.
    for (let attempt = 0; attempt < 3; attempt++) {
      const caseSo = await services.caseService.getCase({ id: caseId });
      const recorded = caseSo.attributes.room_conversation_id;
      if (recorded) {
        await conversations.delete(created.id);
        return { conversation_id: recorded, created: false };
      }
      try {
        await services.caseService.patchCase({
          caseId,
          originalCase: caseSo,
          version: caseSo.version,
          updatedAttributes: {
            room_conversation_id: created.id,
            room_owner_uid: clientArgs.user.profile_uid ?? null,
          },
          refresh: 'wait_for',
        });
        return { conversation_id: created.id, created: true };
      } catch (error) {
        if (!SavedObjectsErrorHelpers.isConflictError(error)) {
          await conversations.delete(created.id);
          throw error;
        }
      }
    }
    await conversations.delete(created.id);
    throw Boom.conflict('The room could not be recorded on the case. Try again.');
  } catch (error) {
    throw createCaseError({
      message: `Failed to open the room of case ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Posts one message from the room to the case as a comment. An agent reply keeps the agent as the
 * actor (and the room as its run); a person's message is posted by the caller and names its author.
 */
export const postFromRoom = async (
  { caseId, request }: { caseId: string; request: PostFromRoomRequest },
  clientArgs: CasesClientArgs,
  casesClient: CasesClient,
  getCasesClientAs: (actionSource: ActionSource) => Promise<CasesClient>
) => {
  const { logger } = clientArgs;
  try {
    const agentBuilder = getAgentBuilderOrThrow(clientArgs);
    const theCase = await casesClient.cases.get({ id: caseId, includeComments: false });
    if (!theCase.room_conversation_id) {
      throw Boom.badRequest('This case has no room yet.');
    }
    const conversations = await agentBuilder.conversations.getScopedClient({
      request: clientArgs.request,
    });
    const room = await conversations.get(theCase.room_conversation_id);
    const event = ((room.events ?? []) as RoomEvent[]).find(({ id }) => id === request.event_id);
    const message = event ? getRoomMessage(event) : undefined;
    if (!message) {
      throw Boom.notFound(`Message ${request.event_id} is not in this case's room.`);
    }

    if (message.kind === 'agent') {
      const asAgent = await getCasesClientAs({
        type: ActionSourceTypes.agent,
        id: room.agent_id,
        name: ROOM_AGENT_NAME,
        run_id: room.id,
      });
      return await asAgent.attachments.add({
        caseId,
        comment: {
          type: COMMENT_ATTACHMENT_TYPE,
          owner: theCase.owner,
          data: { content: message.text.trim() },
        },
      });
    }

    const author = message.author ?? i18n.ROOM_UNKNOWN_AUTHOR;
    return await casesClient.attachments.add({
      caseId,
      comment: {
        type: COMMENT_ATTACHMENT_TYPE,
        owner: theCase.owner,
        data: { content: `${message.text.trim()}\n\n_${i18n.POSTED_FROM_ROOM_BY(author)}_` },
      },
    });
  } catch (error) {
    throw createCaseError({
      message: `Failed to post a room message to case ${caseId}: ${error}`,
      error,
      logger,
    });
  }
};
