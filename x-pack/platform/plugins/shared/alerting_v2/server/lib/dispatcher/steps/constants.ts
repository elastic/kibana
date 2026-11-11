/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DispatchFailureReason as SchemaDispatchFailureReason } from '@kbn/alerting-v2-schemas';

/**
 * Machine-readable causes for a failed action-group → workflow dispatch. Stored
 * as `kibana.alerting_v2.dispatcher.failure_reason` on `dispatch_failed` events
 * so failures can be grouped without parsing the free-form `error.message`.
 */
export const DISPATCH_FAILURE_REASONS = {
  /** The policy had no decrypted API key, so the whole group was skipped. */
  MISSING_API_KEY: 'missing_api_key',
  /** The destination workflow id could not be resolved. */
  WORKFLOW_NOT_FOUND: 'workflow_not_found',
  /** The destination workflow exists but is disabled. */
  WORKFLOW_DISABLED: 'workflow_disabled',
  /** Scheduling the workflow execution threw (e.g. Task Manager error). */
  SCHEDULE_ERROR: 'schedule_error',
  /** The cluster license does not allow action policies, so workflows are not scheduled. */
  LICENSE_NOT_SUPPORTED: 'license_not_supported',
} as const satisfies Record<string, SchemaDispatchFailureReason>;

export type DispatchFailureReason = SchemaDispatchFailureReason;
