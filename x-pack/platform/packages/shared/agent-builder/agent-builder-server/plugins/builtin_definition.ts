/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginDefinition, PluginManifestMetadata } from '@kbn/agent-builder-common';
import type { SkillDefinition } from '../skills';

/**
 * Represents a built-in plugin definition, as registered by solution teams
 * using the plugins setup contract.
 *
 * Built-in plugins are read-only and self-contained: they embed their skill
 * definitions directly, so registration is a single call. Under the hood,
 * the plugin service registers those skills into the skill registry with
 * their `plugin_id` set, mirroring how installable plugins work.
 */
export type BuiltInPluginDefinition = Pick<
  PluginDefinition,
  'id' | 'name' | 'version' | 'description'
> & {
  manifest?: PluginManifestMetadata;
  /**
   * Built-in skill definitions that are part of this plugin.
   * These will be registered into the skill registry with `plugin_id`
   * set to this plugin's ID.
   */
  skills?: SkillDefinition[];
};
