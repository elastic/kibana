/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '../../shared_imports';

export interface PipelinesPrivileges {
  canRead: boolean;
  canManage: boolean;
}

/**
 * Derives whether the current user can view and/or manage ingest pipelines from the UI capabilities.
 */
export const usePipelinesPrivileges = (): PipelinesPrivileges => {
  const {
    config: { canManage, canRead },
  } = useKibana().services;

  return {
    canManage,
    canRead: canManage || canRead,
  };
};
