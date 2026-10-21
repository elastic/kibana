/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import type { ServiceAccount } from '@kbn/core-security-browser';

export interface CreateServiceAccountProps {
  onClose: () => void;
  onCreated: (account: ServiceAccount) => void;
}

export const getCreateServiceAccountComponent = async (
  core: CoreStart,
  isServerless: boolean,
  roleManagementEnabled: boolean
): Promise<React.FC<CreateServiceAccountProps>> => {
  const [{ CreateServiceAccountFlyout }, { RolesAPIClient }] = await Promise.all([
    import('../management/service_accounts/create_service_account_flyout'),
    import('../management/roles/roles_api_client'),
  ]);
  const rolesAPIClient = new RolesAPIClient(core.http);
  const createRoleUrl =
    roleManagementEnabled && core.application.capabilities.roles?.save
      ? core.application.getUrlForApp('management', { path: '/security/roles/edit' })
      : undefined;

  return (props) =>
    core.security.serviceAccounts.isEnabled() && core.security.serviceAccounts.canCreate() ? (
      <CreateServiceAccountFlyout
        {...props}
        isServerless={isServerless}
        serviceAccountsAPIClient={core.security.serviceAccounts}
        rolesAPIClient={rolesAPIClient}
        createRoleUrl={createRoleUrl}
      />
    ) : null;
};
