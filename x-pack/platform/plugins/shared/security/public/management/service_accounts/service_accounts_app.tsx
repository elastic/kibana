/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import useMountedState from 'react-use/lib/useMountedState';

import type { ServiceAccount } from '@kbn/core-security-browser';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { CreateServiceAccountFlyout } from './create_service_account_flyout';
import { ServiceAccountsPage } from './service_accounts_page';
import type { ServiceAccountsAPIClient } from '../../service_accounts';
import type { RolesAPIClient } from '../roles';

interface Props {
  isServerless: boolean;
  canCreate: boolean;
  serviceAccountsAPIClient: Pick<PublicMethodsOf<ServiceAccountsAPIClient>, 'create' | 'list'>;
  rolesAPIClient: Pick<PublicMethodsOf<RolesAPIClient>, 'getRoles'>;
  createRoleUrl?: string;
  onCreated: (account: ServiceAccount) => void;
}

export const ServiceAccountsApp = ({
  isServerless,
  canCreate,
  serviceAccountsAPIClient,
  rolesAPIClient,
  createRoleUrl,
  onCreated,
}: Props) => {
  const history = useHistory();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const isMounted = useMountedState();
  const creationClient = useMemo(
    () => ({
      create: async (params: Parameters<ServiceAccountsAPIClient['create']>[0]) => {
        const account = await serviceAccountsAPIClient.create(params);
        if (isMounted()) {
          setRefreshKey((value) => value + 1);
          onCreated(account);
        }
        return account;
      },
    }),
    [serviceAccountsAPIClient, isMounted, onCreated]
  );

  return (
    <>
      <ServiceAccountsPage
        key={refreshKey}
        canCreate={canCreate}
        serviceAccountsAPIClient={serviceAccountsAPIClient}
        onCreateAccount={() => history.push('/create')}
      />
      {canCreate && location.pathname === '/create' && (
        <CreateServiceAccountFlyout
          isServerless={isServerless}
          serviceAccountsAPIClient={creationClient}
          rolesAPIClient={rolesAPIClient}
          createRoleUrl={createRoleUrl}
          onClose={() => history.replace('/')}
          onCreated={() => history.replace('/')}
        />
      )}
    </>
  );
};
