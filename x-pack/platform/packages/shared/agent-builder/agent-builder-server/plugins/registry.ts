/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition } from '@kbn/agent-builder-common';
import type { PluginCreateRequest, PluginUpdateRequest } from './crud';

export interface PluginRegistry {
  has(pluginId: string): Promise<boolean>;
  get(pluginId: string): Promise<PluginDefinition>;
  findByName(name: string): Promise<PluginDefinition | undefined>;
  list(): Promise<PluginDefinition[]>;
  create(request: PluginCreateRequest): Promise<PluginDefinition>;
  update(pluginId: string, update: PluginUpdateRequest): Promise<PluginDefinition>;
  delete(pluginId: string): Promise<void>;
}
