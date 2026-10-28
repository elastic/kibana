/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAuthorizationContext } from '../../shared_imports';
import {
  APP_CLUSTER_MANAGE_PRIVILEGES,
  APP_CLUSTER_READ_PRIVILEGES,
} from '../../../common/constants';

export interface PipelinesPrivileges {
  canRead: boolean;
  canManage: boolean;
}

/**
 * Derives whether the current user can view and/or manage ingest pipelines from the authorization context.
 */
export const usePipelinesPrivileges = (): PipelinesPrivileges => {
  const { privileges } = useAuthorizationContext();
  const missingClusterPrivileges = privileges.missingPrivileges.cluster ?? [];

  const hasAll = (required: readonly string[]): boolean =>
    required.every((privilege) => !missingClusterPrivileges.includes(privilege));

  const canManage = hasAll(APP_CLUSTER_MANAGE_PRIVILEGES);

  return {
    canManage,
    canRead: canManage || hasAll(APP_CLUSTER_READ_PRIVILEGES),
  };
};
