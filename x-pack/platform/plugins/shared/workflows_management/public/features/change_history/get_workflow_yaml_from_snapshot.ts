/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Workflow snapshot shape stored in change-history detail payloads. */
export interface WorkflowHistorySnapshot {
  workflow?: {
    yaml?: unknown;
  };
}

export const getWorkflowYamlFromSnapshot = (snapshot: unknown): string => {
  if (!snapshot || typeof snapshot !== 'object') {
    return '';
  }

  const yaml = (snapshot as WorkflowHistorySnapshot).workflow?.yaml;

  return typeof yaml === 'string' ? yaml : '';
};
