/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers, KibanaRequest } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import type {
  CallerSnapshot,
  CoreSecurityDelegateContract,
  GrantUiamAPIKeyParams,
  InvalidateUiamAPIKeyParams,
} from '@kbn/core-security-server';
import { asSpaceId } from '@kbn/core-spaces-common';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import type { InternalAuthenticationServiceStart } from './authentication';
import type { Session } from './session_management';
import { getPrintableSessionId } from './session_management';
import type { UserProfileServiceStartInternal } from './user_profile';

export const buildSecurityApi = ({
  getAuthc,
  getSession,
  audit,
  config,
}: {
  getAuthc: () => InternalAuthenticationServiceStart;
  getSession: () => Pick<Session, 'getSID'>;
  audit: AuditServiceSetup;
  config: { uiam?: { enabled: boolean } };
}): CoreSecurityDelegateContract => {
  return {
    authc: {
      getCurrentUser: (request) => {
        return getAuthc().getCurrentUser(request);
      },
      getRedactedSessionId: async (request) => {
        const sid = await getSession().getSID(request);
        return sid ? getPrintableSessionId(sid) : undefined;
      },
      captureCaller: (request) => captureCallerImpl(request, getAuthc),
      replayCaller: (snapshot) => replayCallerImpl(snapshot),
      stampCaller: (parts) => stampCallerImpl(parts),
      adoptPersistedCaller: (persisted) => adoptPersistedCallerImpl(persisted),
      apiKeys: {
        areAPIKeysEnabled: () => getAuthc().apiKeys.areAPIKeysEnabled(),
        areCrossClusterAPIKeysEnabled: () => getAuthc().apiKeys.areAPIKeysEnabled(),
        grantAsInternalUser: (request, createParams) =>
          getAuthc().apiKeys.grantAsInternalUser(request, createParams),
        cloneAsInternalUser: (request, cloneParams) =>
          getAuthc().apiKeys.cloneAsInternalUser(request, cloneParams),
        create: (request, createParams) => getAuthc().apiKeys.create(request, createParams),
        update: (request, updateParams) => getAuthc().apiKeys.update(request, updateParams),
        validate: (apiKeyParams) => getAuthc().apiKeys.validate(apiKeyParams),
        invalidate: (request, params) => getAuthc().apiKeys.invalidate(request, params),
        invalidateAsInternalUser: (params) => getAuthc().apiKeys.invalidateAsInternalUser(params),
        uiam: config.uiam?.enabled
          ? {
              grant: (request: KibanaRequest, grantUiamApiKeyParams: GrantUiamAPIKeyParams) =>
                getAuthc().apiKeys.uiam!.grant(request, grantUiamApiKeyParams),
              invalidate: (
                request: KibanaRequest,
                invalidateUiamApiKeyParams: InvalidateUiamAPIKeyParams
              ) => getAuthc().apiKeys.uiam!.invalidate(request, invalidateUiamApiKeyParams),
              convert: (keys: string[]) => getAuthc().apiKeys.uiam!.convert(keys),
            }
          : null,
      },
    },
    audit: {
      asScoped(request) {
        return audit.asScoped(request);
      },
      withoutRequest: {
        log: audit.withoutRequest.log,
        enabled: audit.withoutRequest.enabled,
        includeSavedObjectNames: audit.withoutRequest.includeSavedObjectNames,
      },
    },
  };
};

export const buildUserProfileApi = ({
  getUserProfile,
}: {
  getUserProfile: () => UserProfileServiceStartInternal;
}): CoreUserProfileDelegateContract => {
  return {
    getCurrent: (params) => getUserProfile().getCurrent(params),
    suggest: (params) => getUserProfile().suggest(params),
    bulkGet: (params) => getUserProfile().bulkGet(params),
    update: (uids, data) => getUserProfile().update(uids, data),
  };
};

/**
 * Version marker for the caller-snapshot envelope. Producers stamp this so
 * future replayers can detect (and refuse) shapes they don't understand.
 *
 * In scope: identity context only (auth credential, space, profile uid).
 * NOT in scope: Task Manager api-key bookkeeping fields (`apiKey`,
 * `uiamApiKey`, `userScope`) — those live on `task.userScope` and are
 * unrelated to the caller-snapshot contract.
 */
const CALLER_SNAPSHOT_VERSION = 1 as const;

interface SerializedCallerSnapshotV1 {
  v: typeof CALLER_SNAPSHOT_VERSION;
  /** Raw Authorization header value captured from the source request. */
  authorization?: string;
  /** Space ID derived from the source request. */
  spaceId?: string;
  /** Kibana user-profile UID resolved at capture time. */
  userProfileId?: string;
}

const isSerializedCallerSnapshotV1 = (
  snapshot: CallerSnapshot
): snapshot is SerializedCallerSnapshotV1 & CallerSnapshot =>
  typeof snapshot === 'object' &&
  snapshot !== null &&
  (snapshot as { v?: unknown }).v === CALLER_SNAPSHOT_VERSION;

const captureCallerImpl = async (
  request: KibanaRequest,
  getAuthc: () => InternalAuthenticationServiceStart
): Promise<CallerSnapshot | undefined> => {
  const authorization =
    typeof request.headers?.authorization === 'string' ? request.headers.authorization : undefined;
  const spaceId =
    (request as unknown as { fakeRawRequest?: { spaceId?: string } }).fakeRawRequest?.spaceId ??
    undefined;

  // Look up profile_uid from the live request. Best-effort: if getCurrentUser
  // throws or returns null/undefined, we simply omit userProfileId. This is
  // the call that justifies captureCaller being async — the snapshot stamps
  // the resolved profile so background runs can act on behalf of the user
  // without re-resolving identity at run time.
  let userProfileId: string | undefined;
  try {
    const currentUser = getAuthc().getCurrentUser(request);
    userProfileId = currentUser?.profile_uid ?? undefined;
  } catch {
    userProfileId = undefined;
  }

  if (!authorization && !spaceId && !userProfileId) {
    return undefined;
  }

  const snapshot: SerializedCallerSnapshotV1 = {
    v: CALLER_SNAPSHOT_VERSION,
    ...(authorization ? { authorization } : {}),
    ...(spaceId ? { spaceId } : {}),
    ...(userProfileId ? { userProfileId } : {}),
  };
  // Trust-boundary mint: only Core/Security is permitted to produce values of
  // the branded `CallerSnapshot` type.
  return snapshot as unknown as CallerSnapshot;
};

const replayCallerImpl = (snapshot: CallerSnapshot): KibanaRequest | undefined => {
  if (!isSerializedCallerSnapshotV1(snapshot)) {
    // Forward-compat: unknown shape from a newer producer — refuse rather
    // than fabricate a request. Consumers should fall back to their legacy
    // path (e.g. Task Manager's api-key based fake request).
    return undefined;
  }
  const { authorization, spaceId } = snapshot;
  if (!authorization) {
    return undefined;
  }
  const requestHeaders: Headers = { authorization };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    ...(spaceId ? { spaceId: asSpaceId(spaceId) } : {}),
  };
  return kibanaRequestFactory(fakeRawRequest);
};

const stampCallerImpl = (parts: {
  authorization?: string;
  spaceId?: string;
  userProfileId?: string;
}): CallerSnapshot | undefined => {
  const { authorization, spaceId, userProfileId } = parts;
  if (!authorization && !spaceId && !userProfileId) {
    return undefined;
  }
  const snapshot: SerializedCallerSnapshotV1 = {
    v: CALLER_SNAPSHOT_VERSION,
    ...(authorization ? { authorization } : {}),
    ...(spaceId ? { spaceId } : {}),
    ...(userProfileId ? { userProfileId } : {}),
  };
  return snapshot as unknown as CallerSnapshot;
};

const adoptPersistedCallerImpl = (persisted: unknown): CallerSnapshot | undefined => {
  if (!persisted || typeof persisted !== 'object') return undefined;
  const v = (persisted as { v?: unknown }).v;
  if (typeof v !== 'number') return undefined;
  return persisted as CallerSnapshot;
};
