/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext } from 'react';
import { useLoadPermissions } from '../services';

// This is wrong as we are accesing outside of the lib root folder
// just temporary until we have our "shared ES UI" plugin in place
import { SectionError } from '../../../components';

interface Authorization {
  loaded: boolean;
  permissions?: {
    hasAllPermissions: boolean;
    missingPrivileges?: MissingPrivileges;
  };
}

export interface MissingPrivileges {
  [key: string]: string[];
}

const initialValue: Authorization = {
  loaded: false,
};

export const AuthorizationContext = createContext<Authorization>(initialValue);

interface Props {
  permissionEndpoint: string;
  FormattedMessage: typeof ReactIntl.FormattedMessage;
  children: React.ReactNode;
}

export const AuthorizationProvider = ({
  permissionEndpoint,
  FormattedMessage,
  children,
}: Props) => {
  const { error, data: permissionsData } = useLoadPermissions(permissionEndpoint);

  const isLoaded = typeof permissionsData !== 'undefined';

  // Note: here we have to serialize the HTTP response
  // If we move forward with proposal, we would need to update the SR server response
  // to implement the interface below..
  const value = {
    ...initialValue,
    loaded: isLoaded,
    permissions: isLoaded
      ? {
          hasAllPermissions: permissionsData.hasPermission,
          missingPrivileges: {
            cluster: permissionsData.missingClusterPrivileges,
            index: ['some index privilege'],
            // index: permissionsData.missingIndexPrivileges,
          },
        }
      : undefined,
  };

  return error ? (
    <SectionError
      title={
        <FormattedMessage
          id="xpack.snapshotRestore.app.checkingPermissionsErrorMessage"
          defaultMessage="Error checking permissions"
        />
      }
      error={error}
    />
  ) : (
    <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>
  );
};
