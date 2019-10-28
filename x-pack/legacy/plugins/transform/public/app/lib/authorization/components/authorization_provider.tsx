/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useRequest } from '../../../services/http/use_request';
import { hasPrivilegeFactory, Capabilities, Privileges } from './common';

interface ApiError {
  data: {
    error: string;
    cause?: string[];
    message?: string;
  };
}

interface Authorization {
  isLoading: boolean;
  apiError: ApiError | null;
  privileges: Privileges;
  capabilities: Capabilities;
}

const initialCapabalities: Capabilities = {
  canGetTransform: false,
  canDeleteTransform: false,
  canPreviewTransform: false,
  canCreateTransform: false,
  canStartStopTransform: false,
};

const initialValue: Authorization = {
  isLoading: true,
  apiError: null,
  privileges: {
    hasAllPrivileges: false,
    missingPrivileges: {},
  },
  capabilities: initialCapabalities,
};

export const AuthorizationContext = createContext<Authorization>({ ...initialValue });

interface Props {
  privilegesEndpoint: string;
  children: React.ReactNode;
}

export const AuthorizationProvider = ({ privilegesEndpoint, children }: Props) => {
  const { isLoading, error, data: privilegesData } = useRequest({
    path: privilegesEndpoint,
    method: 'get',
  });

  const value = {
    isLoading,
    privileges: isLoading ? { ...initialValue.privileges } : privilegesData,
    capabilities: { ...initialCapabalities },
    apiError: error ? (error as ApiError) : null,
  };

  const hasPrivilege = hasPrivilegeFactory(value.privileges);

  value.capabilities.canGetTransform =
    hasPrivilege(['cluster', 'cluster:monitor/transform/get']) &&
    hasPrivilege(['cluster', 'cluster:monitor/transform/stats/get']);

  value.capabilities.canCreateTransform = hasPrivilege(['cluster', 'cluster:admin/transform/put']);

  value.capabilities.canDeleteTransform = hasPrivilege([
    'cluster',
    'cluster:admin/transform/delete',
  ]);

  value.capabilities.canPreviewTransform = hasPrivilege([
    'cluster',
    'cluster:admin/transform/preview',
  ]);

  value.capabilities.canStartStopTransform =
    hasPrivilege(['cluster', 'cluster:admin/transform/start']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/start_task']) &&
    hasPrivilege(['cluster', 'cluster:admin/transform/stop']);

  return (
    <AuthorizationContext.Provider value={{ ...value }}>{children}</AuthorizationContext.Provider>
  );
};
