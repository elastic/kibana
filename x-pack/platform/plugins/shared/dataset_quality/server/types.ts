/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import { CustomRequestHandlerContext } from '@kbn/core/server';
import type { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { TelemetryPluginSetup, TelemetryPluginStart } from '@kbn/telemetry-plugin/server';
import { UsageCollectionSetup, UsageCollectionStart } from '@kbn/usage-collection-plugin/server';

export interface DatasetQualityPluginSetupDependencies {
  alerting?: AlertingServerSetup;
  fleet: FleetSetupContract;
  taskManager: TaskManagerSetupContract;
  telemetry: TelemetryPluginSetup;
  usageCollection?: UsageCollectionSetup;
  share?: SharePluginSetup;
}

export interface DatasetQualityPluginStartDependencies {
  alerting?: AlertingServerStart;
  fleet: FleetStartContract;
  taskManager: TaskManagerStartContract;
  telemetry: TelemetryPluginStart;
  usageCollection?: UsageCollectionStart;
  share?: SharePluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginStart {}

export type DatasetQualityRequestHandlerContext = CustomRequestHandlerContext<{}>;
