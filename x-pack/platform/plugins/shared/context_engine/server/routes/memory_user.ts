/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { apiPrivileges } from '../../common/features';

/**
 * Security for memory routes that write. Checks `manage_memory` without requiring it, so the
 * handler allows callers to act on their own memory.
 */
export const MEMORY_WRITE_SECURITY: RouteSecurity = {
  authz: {
    requiredPrivileges: [apiPrivileges.writeContextEngine],
    extendedPrivileges: [apiPrivileges.manageMemory],
  },
};

export const MANAGE_MEMORY_REQUIRED_MESSAGE = `Acting on the memory of another user requires the [${apiPrivileges.manageMemory}] privilege.`;

export const NO_PROFILE_MESSAGE =
  'The caller has no user profile, so the request cannot be attributed to a user. Set `user_id`, log in to Kibana once to create a profile, or use an API key whose owner has one.';

/** Creates an `Error` with `name: 'Forbidden'` for consistent audit logging. */
export const forbiddenError = (message: string): Error =>
  Object.assign(new Error(message), { name: 'Forbidden' });

/** Normalizes any thrown value to an `Error` instance for audit and error logging. */
export const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

/**
 * Returns whether the request may act on the memory of `userId`. Callers can act on their own
 * memory and need `manage_memory` for another user.
 */
export const canActOnUserMemory = (
  request: KibanaRequest,
  userId: string,
  callerUserId: string | undefined
): boolean => userId === callerUserId || request.authzResult?.[apiPrivileges.manageMemory] === true;

export type ResolvedMemoryUser =
  | { ok: true; userId: string }
  | { ok: false; userId?: string; error: Error };

/**
 * Resolves the target user for a memory write route and checks whether the caller may act on it.
 * Fails when `user_id` is omitted and the caller has no profile, or when the caller targets
 * another user without `contextEngine:manage_memory`.
 */
export const resolveMemoryUser = async ({
  request,
  userProfile,
  requestedUserId,
}: {
  request: KibanaRequest;
  userProfile: { getCurrentProfileId: () => Promise<string | null> };
  requestedUserId?: string;
}): Promise<ResolvedMemoryUser> => {
  const callerUserId = (await userProfile.getCurrentProfileId()) ?? undefined;
  const userId = requestedUserId ?? callerUserId;
  if (userId === undefined) {
    return { ok: false, error: forbiddenError(NO_PROFILE_MESSAGE) };
  }
  if (!canActOnUserMemory(request, userId, callerUserId)) {
    return { ok: false, userId, error: forbiddenError(MANAGE_MEMORY_REQUIRED_MESSAGE) };
  }
  return { ok: true, userId };
};
