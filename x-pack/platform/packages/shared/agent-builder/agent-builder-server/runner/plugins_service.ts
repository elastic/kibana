/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runtime service to resolve plugin-contributed skill IDs during agent execution.
 */
export interface PluginsService {
  /**
   * Given a list of plugin IDs, returns the union of all skill IDs contributed by those plugins.
   * Plugins that are not found are silently ignored.
   */
  resolveSkillIds(pluginIds: string[]): Promise<string[]>;
}
