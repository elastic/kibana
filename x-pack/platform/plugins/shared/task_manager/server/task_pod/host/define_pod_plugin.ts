/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import type { ContainerModule } from 'inversify';

/** Minimal, JSON-config-driven stand-in for a plugin's `PluginInitializerContext`. */
export interface PodPluginInitializerContext {
  opaqueId: symbol;
  logger: { get: (...contextParts: string[]) => unknown };
  config: { get: <T>() => T };
  env: { packageInfo: { version: string; buildFlavor: string; branch: string; dist: boolean } };
  node: { roles: { backgroundTasks: boolean; ui: boolean; migrator: boolean } };
}

export interface PodPluginDefinition {
  /** The plugin id, matching `PluginSetup('<id>')` / `PluginStart('<id>')` tokens. */
  id: string;
  /** kibana.yml path of the plugin's config; its slice of the pod config file is validated with `configSchema`. */
  configPath?: string[];
  configSchema?: Type<unknown>;
  requiredPlugins?: string[];
  optionalPlugins?: string[];
  /** DI plugin: loaded into the plugin's container exactly as Core loads `server/index.ts`'s `module`. */
  module?: ContainerModule;
  /**
   * Classic plugin lifecycle, same signature as a real plugin class. `core` and `plugins` are
   * untyped here so a plugin can declare the real types of the parts of Core and of its
   * dependencies that it uses.
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  setup?: (core: any, plugins: any, context: PodPluginInitializerContext) => unknown;
  start?: (core: any, plugins: any, context: PodPluginInitializerContext) => unknown;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** Declares a plugin (or a pod-side version of one) the pod host should boot. */
export const definePodPlugin = (definition: PodPluginDefinition): PodPluginDefinition => definition;
