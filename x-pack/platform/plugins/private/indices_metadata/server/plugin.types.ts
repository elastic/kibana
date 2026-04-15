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

export type IndicesMetadataPluginSetup = void;

export type IndicesMetadataPluginStart = void;

export interface IndicesMetadataPluginSetupDeps {
  taskManager: TaskManagerSetupContract;
}

export interface IndicesMetadataPluginStartDeps {
  taskManager: TaskManagerStartContract;
  telemetry: TelemetryPluginStart;
}
