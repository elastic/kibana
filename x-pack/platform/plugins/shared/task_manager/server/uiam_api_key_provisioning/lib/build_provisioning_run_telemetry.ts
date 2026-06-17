/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerUiamProvisioningRunEventData } from '../event_based_telemetry';

export const failedProvisioningRunTelemetry = (): TaskManagerUiamProvisioningRunEventData => ({
  total: 0,
  completed: 0,
  failed: 0,
  skipped: 0,
  has_more_to_provision: false,
  has_error: true,
  run_number: 0,
});

/**
 * Shapes run telemetry like Alerting's `UiamProvisioningRunEventData`
 * (`completed` + `failed` + `skipped` = `total`, `has_more_to_provision` from batching).
 */
export const buildSuccessProvisioningRunTelemetry = ({
  completed,
  failed,
  skipped,
  hasMoreToProvision,
  nextRunNumber,
}: {
  completed: number;
  failed: number;
  skipped: number;
  hasMoreToProvision: boolean;
  nextRunNumber: number;
}): TaskManagerUiamProvisioningRunEventData => ({
  total: completed + failed + skipped,
  completed,
  failed,
  skipped,
  has_more_to_provision: hasMoreToProvision,
  has_error: false,
  run_number: nextRunNumber,
});
