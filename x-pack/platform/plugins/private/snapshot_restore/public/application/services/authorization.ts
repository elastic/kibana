/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_SET_DEFAULT_REPOSITORY_CLUSTER_PRIVILEGE } from '../../../common';
import { useAuthorizationContext } from '../../shared_imports';

export const useCanSetDefaultRepository = (): boolean => {
  const { isLoading, privileges } = useAuthorizationContext();
  if (isLoading) {
    return false;
  }

  const missingClusterPrivileges = privileges.missingPrivileges.cluster ?? [];
  return !missingClusterPrivileges.includes(APP_SET_DEFAULT_REPOSITORY_CLUSTER_PRIVILEGE);
};
