/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { TelemetryPluginStart } from '@kbn/telemetry-plugin/server';

export type OtelTelemetryCollectionPluginSetup = void;

export type OtelTelemetryCollectionPluginStart = void;

export interface OtelTelemetryCollectionPluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface OtelTelemetryCollectionPluginStartDeps {
  taskManager: TaskManagerStartContract;
  telemetry?: TelemetryPluginStart;
}
