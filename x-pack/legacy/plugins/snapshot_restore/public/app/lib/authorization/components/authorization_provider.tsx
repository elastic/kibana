/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useRequest } from '../../../services/http/use_request';

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
}

export interface Privileges {
  hasAllPrivileges: boolean;
  missingPrivileges: MissingPrivileges;
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
    apiError: error ? error : null,
  } as Authorization;

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>;
};
