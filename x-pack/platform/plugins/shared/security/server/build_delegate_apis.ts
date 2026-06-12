/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers, KibanaRequest } from '@kbn/core-http-server';
import type {
  CoreSecurityDelegateContract,
  GrantUiamAPIKeyParams,
  InvalidateUiamAPIKeyParams,
  OpaqueRequestState,
} from '@kbn/core-security-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
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
      serializeRequest: (request) => serializeRequestImpl(request, getAuthc),
      hydrateRequest: (requestState) => hydrateRequestImpl(requestState),
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
 * Internal version markers for the opaque request-state envelope. Producers stamp
 * the current version so future hydrators can detect (and ignore) shapes they
 * don't understand. Consumers MUST NOT branch on individual fields.
 */
const REQUEST_STATE_VERSION = 1 as const;

interface SerializedRequestStateV1 {
  v: typeof REQUEST_STATE_VERSION;
  /** Raw Authorization header value, when present on the source request. */
  authorization?: string;
  /** Space ID derived from the source request (defaults to 'default' if unknown). */
  spaceId?: string;
}

const isSerializedRequestStateV1 = (
  state: OpaqueRequestState
): state is SerializedRequestStateV1 & OpaqueRequestState =>
  typeof state === 'object' && state !== null && (state as { v?: unknown }).v === REQUEST_STATE_VERSION;

const serializeRequestImpl = (
  request: KibanaRequest,
  getAuthc: () => InternalAuthenticationServiceStart
): OpaqueRequestState | undefined => {
  // Best-effort: capture only the inputs needed to reconstruct a scoped fake
  // request later. Identity hints (e.g. profile_uid) can be added here without
  // requiring downstream persisters to learn about new fields.
  const authorization =
    typeof request.headers?.authorization === 'string' ? request.headers.authorization : undefined;
  const spaceId =
    (request as unknown as { fakeRawRequest?: { spaceId?: string } }).fakeRawRequest?.spaceId ??
    undefined;

  // Touch getAuthc to keep the dependency explicit; future versions may resolve
  // additional identity context from the live auth service at schedule time.
  void getAuthc;

  if (!authorization && !spaceId) {
    return undefined;
  }

  const state: SerializedRequestStateV1 = {
    v: REQUEST_STATE_VERSION,
    ...(authorization ? { authorization } : {}),
    ...(spaceId ? { spaceId } : {}),
  };
  return state as OpaqueRequestState;
};

const hydrateRequestImpl = (requestState: OpaqueRequestState): KibanaRequest | undefined => {
  if (!isSerializedRequestStateV1(requestState)) {
    // Forward-compat: unknown shape from a newer producer — ignore rather than
    // fabricate a request. Older nodes should round-trip the bag untouched.
    return undefined;
  }

  const { authorization, spaceId } = requestState;
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