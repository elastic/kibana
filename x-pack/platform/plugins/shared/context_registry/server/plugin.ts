/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext, Plugin as PluginType } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { ContextRegistryServer } from './services/context_registry_server';
import { ContextRegistryConfig } from '../common/config';

export interface ContextRegistryServerSetup {
  config: ContextRegistryConfig;
  registry: ContextRegistryServer;
}

export interface ContextRegistryServerStart {
  config: ContextRegistryConfig;
  registry: ContextRegistryServer;
}

export class ContextRegistryPlugin implements PluginType {
  private config: ContextRegistryConfig;
  private registry: ContextRegistryServer;
  private readonly logger: Logger;

  constructor(private readonly initContext: PluginInitializerContext<ContextRegistryConfig>) {
    this.logger = this.initContext.logger.get();
    this.registry = new ContextRegistryServer(this.logger);
    this.config = this.initContext.config.get<ContextRegistryConfig>();
  }

  public setup() {
    return {
      config: this.config,
      registry: this.registry,
    };
  }

  public start() {
    return {
      config: this.config,
      registry: this.registry,
    };
  }

  public stop() {}
}
