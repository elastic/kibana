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

import type { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginSetup, SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { PluginStart as DataPluginStart } from '@kbn/data-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

export type AlertingServerSetup = void;
export type AlertingServerStart = void;

export interface AlertingServerSetupDependencies {
  taskManager: TaskManagerSetupContract;
  features: FeaturesPluginSetup;
  spaces: SpacesPluginSetup;
}

export interface AlertingServerStartDependencies {
  taskManager: TaskManagerStartContract;
  features: FeaturesPluginStart;
  spaces: SpacesPluginStart;
  data: DataPluginStart;
  security?: SecurityPluginStart;
}
