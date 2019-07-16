/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useLoadPermissions } from '../services';

interface Authorization {
  isLoading: boolean;
  apiError: {
    data: {
      error: string;
      cause?: string[];
      message?: string;
    };
  } | null;
  privileges: {
    hasAllPrivileges: boolean;
    missingPrivileges: MissingPrivileges;
  };
}

export interface MissingPrivileges {
  [key: string]: string[] | undefined;
}

const initialValue: Authorization = {
  isLoading: true,
  apiError: null,
  privileges: {
    hasAllPrivileges: true,
    missingPrivileges: {},
  },
};

export const AuthorizationContext = createContext<Authorization>(initialValue);

interface Props {
  permissionEndpoint: string;
  children: React.ReactNode;
}

export const AuthorizationProvider = ({ permissionEndpoint, children }: Props) => {
  const { loading, error, data: permissionsData } = useLoadPermissions(permissionEndpoint);

  const value = {
    isLoading: loading,
    privileges: loading ? { hasAllPrivileges: true, missingPrivileges: {} } : permissionsData,
    apiError: error ? error : null,
  };

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
};
