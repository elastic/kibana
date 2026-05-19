/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
export interface TaskManagerUiamProvisioningRunEventData {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  has_more_to_provision: boolean;
  has_error: boolean;
  run_number: number;
}
export declare const TASK_MANAGER_UIAM_PROVISIONING_RUN_EVENT: EventTypeOpts<TaskManagerUiamProvisioningRunEventData>;
export declare const taskManagerUiamProvisioningEvents: Array<
  EventTypeOpts<Record<string, unknown>>
>;
