/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition, PluginManifestMetadata } from '@kbn/agent-builder-common';

/**
 * Represents a built-in plugin definition, as registered by solution teams
 * using the plugins setup contract.
 *
 * Built-in plugins are read-only and contain the same metadata as persisted plugins,
 * plus optional lists of built-in skill IDs and other asset types.
 */
export type BuiltInPluginDefinition = Pick<
  PluginDefinition,
  'id' | 'name' | 'version' | 'description'
> & {
  manifest?: PluginManifestMetadata;
  /**
   * IDs of built-in skills that are part of this plugin.
   */
  skill_ids?: string[];
};
