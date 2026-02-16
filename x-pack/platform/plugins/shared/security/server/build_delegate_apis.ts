/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  CoreSecurityDelegateContract,
  GrantUiamAPIKeyParams,
  InvalidateUiamAPIKeyParams,
} from '@kbn/core-security-server';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';
import type { AuditServiceSetup } from '@kbn/security-plugin-types-server';

import type { InternalAuthenticationServiceStart } from './authentication';
import type { UserProfileServiceStartInternal } from './user_profile';

export const buildSecurityApi = ({
  getAuthc,
  audit,
  config,
}: {
  getAuthc: () => InternalAuthenticationServiceStart;
  audit: AuditServiceSetup;
  config: { uiam?: { enabled: boolean } };
}): CoreSecurityDelegateContract => {
  return {
    authc: {
      getCurrentUser: (request) => {
        return getAuthc().getCurrentUser(request);
      },
      apiKeys: {
        areAPIKeysEnabled: () => getAuthc().apiKeys.areAPIKeysEnabled(),
        areCrossClusterAPIKeysEnabled: () => getAuthc().apiKeys.areAPIKeysEnabled(),
        grantAsInternalUser: (request, createParams) =>
          getAuthc().apiKeys.grantAsInternalUser(request, createParams),
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
