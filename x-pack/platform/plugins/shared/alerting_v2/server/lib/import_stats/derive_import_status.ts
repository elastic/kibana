/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportStatus } from '@kbn/alerting-v2-schemas';

/** An import that got an alert within this long counts as receiving. */
export const IMPORT_RECEIVING_WINDOW_MS = 24 * 60 * 60 * 1000;

const FAILED_EXECUTION_STATUSES = ['failed', 'timed_out'];

export interface ImportStatusInput {
  /** The `enabled` flag of the config record. */
  enabled: boolean;
  connectorExists: boolean;
  workflowExists: boolean;
  workflowEnabled: boolean;
  lastExecutionStatus?: string;
  lastAlertAt: string | null;
  now: Date;
}

/**
 * What a person looking at the list needs to know first. Missing parts come before everything,
 * because nothing else about an import means anything without them.
 */
export const deriveImportStatus = ({
  enabled,
  connectorExists,
  workflowExists,
  workflowEnabled,
  lastExecutionStatus,
  lastAlertAt,
  now,
}: ImportStatusInput): ImportStatus => {
  if (!connectorExists) {
    return 'connector_missing';
  }
  if (!workflowExists) {
    return 'workflow_missing';
  }
  if (!enabled || !workflowEnabled) {
    return 'disabled';
  }
  if (
    lastExecutionStatus !== undefined &&
    FAILED_EXECUTION_STATUSES.includes(lastExecutionStatus)
  ) {
    return 'failing';
  }
  if (lastAlertAt === null) {
    return 'waiting';
  }
  return now.getTime() - new Date(lastAlertAt).getTime() < IMPORT_RECEIVING_WINDOW_MS
    ? 'receiving'
    : 'idle';
};
