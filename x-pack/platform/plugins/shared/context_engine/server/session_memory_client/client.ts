/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { isResponseError } from '@kbn/es-errors';
import {
  CONTEXT_ENGINE_ENABLED_SETTING_ID,
  CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SaveSessionEventsResponse } from '../../common/http_api/session_events';
import type {
  ForgetSessionMemoryResult,
  RememberSessionMemoryResponse,
} from '../../common/http_api/session_memory';
import { apiPrivileges } from '../../common/features';
import { AiIndexWriteForbiddenError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import {
  sessionEventsSaveAuditEvent,
  sessionMemoryForgetAuditEvent,
  sessionMemoryRememberAuditEvent,
} from '../audit/audit_events';
import type { SessionEventInput, SessionEventsService } from '../session_events/types';
import type { BackgroundWriteTracker } from '../session_memory/background_write_tracker';
import type { SessionMemoryScope, SessionMemoryService } from '../session_memory/types';
import { resolveSpaceId } from '../utils/resolve_space_id';
import {
  ContextEngineDisabledError,
  MANAGE_MEMORY_REQUIRED_MESSAGE,
  MemoryDisabledError,
  MemoryForbiddenError,
  NO_PROFILE_MESSAGE,
  RememberCapacityError,
  SessionMemoryNotFoundError,
  WRITE_REQUIRED_MESSAGE,
} from './errors';

export interface SaveSessionEventsInput {
  sessionId: string;
  /** The user the events belong to. Defaults to the caller; another user needs `contextEngine:manage_memory`. */
  userId?: string;
  /** Each must exist in the space and be writable by the caller. */
  aiIndexIds?: readonly string[];
  events: readonly SessionEventInput[];
}

export interface RememberSessionMemoryInput {
  /** Revises this memory, which must be an active memory of the target user. */
  id?: string;
  sessionId: string;
  /** The user the memory belongs to. Defaults to the caller; another user needs `contextEngine:manage_memory`. */
  userId?: string;
  /** Each must exist in the space and be writable by the caller. */
  aiIndexIds?: readonly string[];
  content: string;
  attributes?: Readonly<Record<string, string>>;
}

export interface ForgetSessionMemoriesInput {
  /** The user the memories belong to. Defaults to the caller; another user needs `contextEngine:manage_memory`. */
  userId?: string;
  ids: readonly string[];
}

/**
 * Writes session events and memories on behalf of one request. Every method checks that Context
 * Engine (and, except for `forget`, memory) is on, that the caller may write for the target user
 * and to each AI index, and audits the outcome.
 */
export interface SessionMemoryClient {
  /** Saves the events of a session and returns one result per event, in input order. */
  saveEvents(input: SaveSessionEventsInput): Promise<SaveSessionEventsResponse>;
  /**
   * Checks the request, then writes the memory in the background and returns its id at once. A
   * failed background write is logged and audited, not thrown.
   */
  remember(input: RememberSessionMemoryInput): Promise<RememberSessionMemoryResponse>;
  /** Forgets each memory and returns one result per unique id, in input order. Works while memory is off. */
  forget(input: ForgetSessionMemoriesInput): Promise<ForgetSessionMemoryResult[]>;
}

export interface SessionMemoryClientDeps {
  core: Pick<CoreStart, 'uiSettings' | 'savedObjects' | 'userProfile' | 'security'>;
  authz: Pick<SecurityPluginStart['authz'], 'checkPrivilegesDynamicallyWithRequest' | 'actions'>;
  spaces?: SpacesPluginStart;
  aiIndexService: Pick<AiIndexService, 'get'>;
  sessionEvents: Pick<SessionEventsService, 'saveEvents'>;
  sessionMemory: Pick<SessionMemoryService, 'get' | 'remember' | 'forget'>;
  backgroundWrites: BackgroundWriteTracker;
  logger: Logger;
}

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/** Keeps Elasticsearch reasons and bodies out of logs and audit events of background writes. */
const toSafeWriteError = (error: unknown): Error => {
  const name = error instanceof Error && error.name ? error.name : 'Error';
  const message =
    isResponseError(error) && error.statusCode !== undefined
      ? `${name} (status ${error.statusCode})`
      : name;
  return Object.assign(new Error(message), { name });
};

const auditFailureForResult = (
  result: ForgetSessionMemoryResult
): 'not_found' | Error | undefined => {
  switch (result.outcome) {
    case 'forgotten':
    case 'already_forgotten':
      return undefined;
    case 'not_found':
      return 'not_found';
    case 'failed':
      return Object.assign(new Error(result.error), { name: 'failed' });
    default: {
      const exhaustive: never = result;
      throw new Error(`Unsupported forget result: ${JSON.stringify(exhaustive)}`);
    }
  }
};

/** Creates the session memory client for one request. */
export const createSessionMemoryClient = (
  {
    core,
    authz,
    spaces,
    aiIndexService,
    sessionEvents,
    sessionMemory,
    backgroundWrites,
    logger,
  }: SessionMemoryClientDeps,
  request: KibanaRequest
): SessionMemoryClient => {
  const space = resolveSpaceId(spaces, request);
  const auditLogger = core.security.audit.asScoped(request);
  const writeAction = authz.actions.api.get(apiPrivileges.writeContextEngine);
  const manageMemoryAction = authz.actions.api.get(apiPrivileges.manageMemory);
  // Checks the request's space, or globally without Spaces, like route authorization does.
  const checkPrivileges = authz.checkPrivilegesDynamicallyWithRequest(request);

  const assertEnabled = async ({ memory }: { memory: boolean }): Promise<void> => {
    const soClient = core.savedObjects.getScopedClient(request);
    const contextEngineEnabled = await core.uiSettings
      .asScopedToClient(soClient)
      .get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
    if (!contextEngineEnabled) {
      throw new ContextEngineDisabledError();
    }
    const memoryEnabled =
      !memory ||
      (await core.uiSettings
        .globalAsScopedToClient(soClient)
        .get<boolean>(CONTEXT_ENGINE_MEMORY_ENABLED_SETTING_ID));
    if (!memoryEnabled) {
      throw new MemoryDisabledError();
    }
  };

  /** Returns the user to write for: `requestedUserId`, else the caller. */
  const resolveTargetUser = async (requestedUserId: string | undefined): Promise<string> => {
    const { privileges } = await checkPrivileges({ kibana: [writeAction, manageMemoryAction] });
    const hasPrivilege = (action: string) =>
      privileges.kibana.some(({ privilege, authorized }) => privilege === action && authorized);
    if (!hasPrivilege(writeAction)) {
      throw new MemoryForbiddenError(WRITE_REQUIRED_MESSAGE);
    }
    if (requestedUserId !== undefined && hasPrivilege(manageMemoryAction)) {
      return requestedUserId;
    }
    const callerUserId = (await core.userProfile.getCurrentProfileId({ request })) ?? undefined;
    const userId = requestedUserId ?? callerUserId;
    if (userId === undefined) {
      throw new MemoryForbiddenError(NO_PROFILE_MESSAGE);
    }
    if (userId !== callerUserId) {
      throw new MemoryForbiddenError(MANAGE_MEMORY_REQUIRED_MESSAGE);
    }
    return userId;
  };

  /**
   * Throws `AiIndexNotFoundError` for an AI index missing from the space, and
   * `AiIndexWriteForbiddenError` when the caller cannot write an AI index's backing index. Run it
   * only for an authorized caller: looking up a managed AI index can create it.
   */
  const assertAiIndicesWritable = async (aiIndexIds: readonly string[]): Promise<void> => {
    if (aiIndexIds.length === 0) {
      return;
    }
    const aiIndices = await Promise.all(aiIndexIds.map((id) => aiIndexService.get(id, space)));
    const dests = unique(aiIndices.map(({ dest }) => dest.value));
    const { privileges } = await checkPrivileges({
      elasticsearch: {
        cluster: [],
        index: Object.fromEntries(dests.map((dest) => [dest, ['write']])),
      },
    });
    const notWritable = aiIndices.find(
      ({ dest }) =>
        !privileges.elasticsearch.index[dest.value]?.some(
          ({ privilege, authorized }) => privilege === 'write' && authorized
        )
    );
    if (notWritable) {
      throw new AiIndexWriteForbiddenError(notWritable.id);
    }
  };

  return {
    async saveEvents({ sessionId, userId: requestedUserId, aiIndexIds = [], events }) {
      await assertEnabled({ memory: true });
      const uniqueAiIndexIds = unique(aiIndexIds);
      let targetUserId = requestedUserId;
      const audit = (outcome: { saved?: number; failed?: number; error?: Error }) =>
        auditLogger.log(sessionEventsSaveAuditEvent({ sessionId, targetUserId, ...outcome }));

      let response: SaveSessionEventsResponse;
      try {
        targetUserId = await resolveTargetUser(requestedUserId);
        await assertAiIndicesWritable(uniqueAiIndexIds);
        response = await sessionEvents.saveEvents(
          { space, userId: targetUserId },
          { sessionId, aiIndexIds: uniqueAiIndexIds, events }
        );
      } catch (error) {
        audit({ error: toError(error) });
        throw error;
      }

      const failed = response.results.filter(({ status }) => status === 'failed').length;
      audit({ saved: response.results.length - failed, failed });
      return response;
    },

    async remember({
      id,
      sessionId,
      userId: requestedUserId,
      aiIndexIds = [],
      content,
      attributes,
    }) {
      await assertEnabled({ memory: true });
      const uniqueAiIndexIds = unique(aiIndexIds);
      let targetUserId = requestedUserId;
      const audit = (outcome: { memoryId?: string; error?: Error }) =>
        auditLogger.log(
          sessionMemoryRememberAuditEvent({
            sessionId,
            targetUserId,
            revision: id !== undefined,
            ...outcome,
          })
        );

      let scope: SessionMemoryScope;
      try {
        targetUserId = await resolveTargetUser(requestedUserId);
        await assertAiIndicesWritable(uniqueAiIndexIds);
        scope = { space, userId: targetUserId };
        if (id !== undefined && !(await sessionMemory.get(scope, id))) {
          throw new SessionMemoryNotFoundError(id);
        }
      } catch (error) {
        audit({ memoryId: id, error: toError(error) });
        throw error;
      }

      const memoryId = id ?? randomUUID();
      const writeInBackground = async () => {
        try {
          await sessionMemory.remember(scope, {
            id: memoryId,
            sessionId,
            content,
            aiIndexIds: uniqueAiIndexIds,
            attributes,
          });
          audit({ memoryId });
        } catch (error) {
          const safeError = toSafeWriteError(error);
          logger.error(`Failed to remember session memory [id=${memoryId}]: ${safeError.message}`);
          audit({ memoryId, error: safeError });
        }
      };
      if (!backgroundWrites.tryStart(writeInBackground)) {
        const error = new RememberCapacityError();
        audit({ memoryId: id, error });
        throw error;
      }
      return { id: memoryId };
    },

    async forget({ userId: requestedUserId, ids }) {
      await assertEnabled({ memory: false });
      const uniqueIds = unique(ids);
      let targetUserId = requestedUserId;
      const audit = (memoryId: string, failure?: 'not_found' | Error) =>
        auditLogger.log(sessionMemoryForgetAuditEvent({ memoryId, targetUserId, failure }));

      let results: ForgetSessionMemoryResult[];
      try {
        targetUserId = await resolveTargetUser(requestedUserId);
        results = await sessionMemory.forget({ space, userId: targetUserId }, uniqueIds);
      } catch (error) {
        const failure = toError(error);
        uniqueIds.forEach((memoryId) => audit(memoryId, failure));
        throw error;
      }

      results.forEach((result) => audit(result.id, auditFailureForResult(result)));
      return results;
    },
  };
};
