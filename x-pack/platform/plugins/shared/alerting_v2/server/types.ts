/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type AlertingServerSetup = void;
export type AlertingServerStart = void;

export interface AlertingServerSetupDependencies {
  taskManager: TaskManagerSetupContract;
  features: FeaturesPluginSetup;
}

export interface AlertingServerStartDependencies {
  taskManager: TaskManagerStartContract;
}
