/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition } from '@kbn/agent-builder-common';

export interface ListPluginsResponse {
  results: PluginDefinition[];
}

export type GetPluginResponse = PluginDefinition;

export type InstallPluginResponse = PluginDefinition;

export interface DeletePluginResponse {
  success: boolean;
}
