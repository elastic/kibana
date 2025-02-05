/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InstallationAPI } from './services/installation';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface PublicPluginConfig {}

export interface PluginSetupDependencies {}

export interface PluginStartDependencies {}

export interface ProductDocBasePluginSetup {}

export interface ProductDocBasePluginStart {
  installation: InstallationAPI;
}
