/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext } from 'react';

import { AuthorizationContext, MissingPrivileges } from './authorization_provider';

interface Props {
  privileges: string | string[];
  children: (
    childrenProps: {
      isLoading: boolean;
      hasPrivileges: boolean;
      missingPrivileges: string[] | MissingPrivileges;
    }
  ) => JSX.Element;
}

const hasPrivilege = (missingPrivileges: string[]) => {
  if (!Array.isArray(missingPrivileges) || missingPrivileges.length === 0) {
    return true;
  }
  return false;
};

export const WithPrivileges = ({ privileges, children }: Props) => {
  const { loaded, permissions = { missingPrivileges: {} } } = useContext(AuthorizationContext);

  const isLoading = !loaded;
  const arrayProvided = Array.isArray(privileges);
  const privilegesToArray = arrayProvided ? (privileges as string[]) : ([privileges] as string[]);

  const hasPrivileges = isLoading
    ? false
    : privilegesToArray.every(privilege =>
        hasPrivilege((permissions.missingPrivileges as any)[privilege])
      );

  const missingPrivileges = arrayProvided
    ? privilegesToArray.reduce(
        (acc, privilege) => {
          acc[privilege] = (permissions.missingPrivileges as MissingPrivileges)[privilege] || [];
          return acc;
        },
        {} as MissingPrivileges
      )
    : (permissions.missingPrivileges as MissingPrivileges)[privileges as string] || [];

  return children({ isLoading, hasPrivileges, missingPrivileges });
};
