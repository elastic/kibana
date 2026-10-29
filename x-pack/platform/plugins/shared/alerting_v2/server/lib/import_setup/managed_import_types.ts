/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { DATADOG_ALERT_TRANSLATION_WORKFLOW_ID } from '@kbn/workflows/managed';

/**
 * A connector type a managed import can be built on. Only types with a shared, managed workflow
 * that already turns the connector's events into alerts are listed.
 *
 * Why no per-import workflow: the workflows engine runs every enabled workflow whose trigger
 * matches an event, and a managed workflow with `connector-id: "*"` matches every connector.
 * A second workflow pinned to one connector would run as well and create each alert twice.
 */
export interface ManagedImportType {
  /** The `source` stamped on the alerts, and so the logo in the alerts table. */
  source: string;
  /** The shared workflow that creates the alerts. It is never edited or deleted by an import. */
  workflowId: string;
  /** A webhook body this type's connector accepts, for "Send test alert". */
  buildSampleBody: (name: string) => Record<string, unknown>;
}

const MANAGED_IMPORT_TYPES: Record<string, ManagedImportType> = {
  '.datadog': {
    source: 'datadog',
    workflowId: DATADOG_ALERT_TRANSLATION_WORKFLOW_ID,
    // The Datadog connector only emits an event when the body has `monitor_id` and `scopes`.
    buildSampleBody: (name) => ({
      id: uuidv4(),
      title: `Test alert from ${name}`,
      message: 'Sent by "Send test alert". Delete it from the alerts page when done.',
      monitor_id: `test-${uuidv4().slice(0, 8)}`,
      scopes: ['test:true'],
      alert_transition: 'Triggered',
      alert_type: 'error',
      event_type: 'query_alert_monitor',
      severity: 'P3',
      tags: ['test'],
    }),
  },
};

export const getManagedImportType = (connectorTypeId: string): ManagedImportType | undefined =>
  MANAGED_IMPORT_TYPES[connectorTypeId];
