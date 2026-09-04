/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-browser';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-browser';
import type {
  AuthenticationServiceSetup,
  UserProfileAPIClient,
} from '@kbn/security-plugin-types-public';

import type { ConfigType } from './config';
import type { ServiceAccountsAPIClient } from './service_accounts';

export const buildSecurityApi = ({
  authc,
  config,
  serviceAccounts,
  getCapabilities,
}: {
  authc: AuthenticationServiceSetup;
  config: Pick<ConfigType, 'serviceAccounts'>;
  serviceAccounts: ServiceAccountsAPIClient;
  getCapabilities: () => Capabilities | undefined;
}): CoreSecurityDelegateContract => {
  return {
    authc: {
      getCurrentUser: () => authc.getCurrentUser(),
    },
    serviceAccounts: {
      isEnabled: () => config.serviceAccounts?.enabled === true,
      // Core resolves capabilities before any plugin's `start` lifecycle runs, but this delegate is
      // registered during `setup`, so the accessor only yields a value once the security plugin has
      // started. Reading it earlier fails closed.
      canCreate: () => getCapabilities()?.service_accounts?.save === true,
      create: (params) => serviceAccounts.create(params),
    },
  };
};

export const buildUserProfileApi = ({
  userProfile,
}: {
  userProfile: UserProfileAPIClient;
}): CoreUserProfileDelegateContract => {
  return userProfile;
};
