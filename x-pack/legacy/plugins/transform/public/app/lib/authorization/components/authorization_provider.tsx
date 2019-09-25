/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useRequest } from '../../../services/http/use_request';
import { hasPrivilegeFactory, Capabilities, Privileges } from './common';

interface Authorization {
  isLoading: boolean;
  apiError: {
    data: {
      error: string;
      cause?: string[];
      message?: string;
    };
  } | null;
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
    hasAllPrivileges: true,
    missingPrivileges: {},
  },
  capabilities: initialCapabalities,
};

export const AuthorizationContext = createContext<Authorization>(initialValue);

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
    privileges: isLoading ? { hasAllPrivileges: true, missingPrivileges: {} } : privilegesData,
    capabilities: initialCapabalities,
    apiError: error ? error : null,
  };

  const hasPrivilege = hasPrivilegeFactory(value.privileges);

  if (
    hasPrivilege(['cluster', 'cluster:monitor/data_frame/get']) &&
    hasPrivilege(['cluster', 'cluster:monitor/data_frame/stats/get'])
  ) {
    value.capabilities.canGetTransform = true;
  }

  if (hasPrivilege(['cluster', 'cluster:admin/data_frame/put'])) {
    value.capabilities.canCreateTransform = true;
  }

  if (hasPrivilege(['cluster', 'cluster:admin/data_frame/delete'])) {
    value.capabilities.canDeleteTransform = true;
  }

  if (hasPrivilege(['cluster', 'cluster:admin/data_frame/preview'])) {
    value.capabilities.canPreviewTransform = true;
  }

  if (
    hasPrivilege(['cluster', 'cluster:admin/data_frame/start']) &&
    hasPrivilege(['cluster', 'cluster:admin/data_frame/start_task']) &&
    hasPrivilege(['cluster', 'cluster:admin/data_frame/stop'])
  ) {
    value.capabilities.canStartStopTransform = true;
  }

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
};
