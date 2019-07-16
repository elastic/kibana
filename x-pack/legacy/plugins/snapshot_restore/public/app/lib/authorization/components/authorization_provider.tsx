/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useLoadPermissions } from '../services';

interface Authorization {
  isLoaded: boolean;
  apiError: {
    data: {
      error: string;
      cause?: string[];
      message?: string;
    };
  } | null;
  permissions: {
    hasAllPermissions: boolean;
    missingPrivileges: MissingPrivileges;
  };
}

export interface MissingPrivileges {
  [key: string]: string[] | undefined;
}

const initialValue: Authorization = {
  isLoaded: false,
  apiError: null,
  permissions: {
    hasAllPermissions: true,
    missingPrivileges: {},
  },
};

export const AuthorizationContext = createContext<Authorization>(initialValue);

interface Props {
  permissionEndpoint: string;
  children: React.ReactNode;
}

export const AuthorizationProvider = ({ permissionEndpoint, children }: Props) => {
  const { error, data: permissionsData } = useLoadPermissions(permissionEndpoint);

  const isLoaded = typeof permissionsData !== 'undefined';

  // Note: here we have to serialize the HTTP response
  // If we move forward with proposal, we would need to update the SR server response
  // to implement the interface below so we don't need the serialization.
  const value = {
    isLoaded,
    apiError: error ? error : null,
    permissions: {
      hasAllPermissions: isLoaded ? permissionsData.hasPermission : true,
      missingPrivileges: isLoaded
        ? {
            cluster: permissionsData.missingClusterPrivileges,
            index: permissionsData.missingIndexPrivileges,
          }
        : {},
    },
  };

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
};
