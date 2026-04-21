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

export const buildSuccessProvisioningRunTelemetry = ({
  apiKeysToConvertCount,
  convertedCount,
  skippedInBatch,
  hasMoreToUpdate,
  nextRunNumber,
}: {
  apiKeysToConvertCount: number;
  convertedCount: number;
  skippedInBatch: number;
  hasMoreToUpdate: boolean;
  nextRunNumber: number;
}): TaskManagerUiamProvisioningRunEventData => {
  const completed = convertedCount;
  const failed = apiKeysToConvertCount - completed;
  return {
    total: completed + failed + skippedInBatch,
    completed,
    failed,
    skipped: skippedInBatch,
    has_more_to_provision: hasMoreToUpdate,
    has_error: false,
    run_number: nextRunNumber,
  };
};
