/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { AuthorizationProvider } from '../../../shared_imports';
import { useAppContext } from '../../app_context';
import { INTERNAL_API_BASE_PATH } from '../../../../common';

export const EnrichPoliciesAuthProvider: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const {
    services: {
      httpService: { httpClient },
    },
  } = useAppContext();

  return (
    <AuthorizationProvider
      privilegesEndpoint={`${INTERNAL_API_BASE_PATH}/enrich_policies/privileges`}
      httpClient={httpClient}
    >
      {children}
    </AuthorizationProvider>
  );
};
