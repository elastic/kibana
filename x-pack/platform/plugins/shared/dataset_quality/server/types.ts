/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { CustomRequestHandlerContext } from '@kbn/core/server';
import type { FleetSetupContract, FleetStartContract } from '@kbn/fleet-plugin/server';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/server';

export interface DatasetQualityPluginSetupDependencies {
  alerting?: AlertingServerSetup;
  fleet: FleetSetupContract;
  share?: SharePluginSetup;
}

export interface DatasetQualityPluginStartDependencies {
  alerting?: AlertingServerStart;
  fleet: FleetStartContract;
  share?: SharePluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DatasetQualityPluginStart {}

export type DatasetQualityRequestHandlerContext = CustomRequestHandlerContext<{}>;
