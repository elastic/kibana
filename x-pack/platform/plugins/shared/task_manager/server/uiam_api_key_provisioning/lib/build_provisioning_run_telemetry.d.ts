/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerUiamProvisioningRunEventData } from '../event_based_telemetry';
export declare const failedProvisioningRunTelemetry: () => TaskManagerUiamProvisioningRunEventData;
/**
 * Shapes run telemetry like Alerting's `UiamProvisioningRunEventData`
 * (`completed` + `failed` + `skipped` = `total`, `has_more_to_provision` from batching).
 */
export declare const buildSuccessProvisioningRunTelemetry: ({
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
}) => TaskManagerUiamProvisioningRunEventData;
