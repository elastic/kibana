/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import { ContextRegistryBrowserConfig } from '../common/config';
import { ContextRegistryPublic } from './services/context_registry_public';

export type ContextRegistryPublicSetup = ReturnType<ContextRegistryPlugin['setup']>;
export type ContextRegistryPublicStart = ReturnType<ContextRegistryPlugin['start']>;

export class ContextRegistryPlugin implements Plugin {
  private config: ContextRegistryBrowserConfig;
  private registry: ContextRegistryPublic;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ContextRegistryBrowserConfig>();
    this.registry = new ContextRegistryPublic();
  }

  public setup() {
    return {
      registry: this.registry,
      config: this.config,
    };
  }

  public start() {
    return {
      registry: this.registry,
      config: this.config,
    };
  }

  public stop() {}
}
