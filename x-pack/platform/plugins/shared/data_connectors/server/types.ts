/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataSourcesRegistryPluginSetup } from '@kbn/data-sources-registry-plugin/server';

/* eslint-disable @typescript-eslint/no-empty-interface */

export interface DataConnectorsServerSetup {}

export interface DataConnectorsServerStart {}

export interface DataConnectorsServerSetupDependencies {
  dataSourcesRegistry: DataSourcesRegistryPluginSetup;
}

export interface DataConnectorsServerStartDependencies {}
