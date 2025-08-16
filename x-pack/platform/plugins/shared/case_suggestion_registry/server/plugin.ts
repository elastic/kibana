/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext, Plugin as PluginType } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { CaseSuggestionRegistryServer } from './services/case_suggestion_registry_server';
import { CaseSuggestionRegistryConfig } from '../common/config';

export interface CaseSuggestionRegistryServerSetup {
  config: CaseSuggestionRegistryConfig;
  registry: CaseSuggestionRegistryServer;
}

export interface CaseSuggestionRegistryServerStart {
  config: CaseSuggestionRegistryConfig;
  registry: CaseSuggestionRegistryServer;
}

export class CaseSuggestionRegistryPlugin implements PluginType {
  private config: CaseSuggestionRegistryConfig;
  private registry: CaseSuggestionRegistryServer;
  private readonly logger: Logger;

  constructor(
    private readonly initContext: PluginInitializerContext<CaseSuggestionRegistryConfig>
  ) {
    this.logger = this.initContext.logger.get();
    this.registry = new CaseSuggestionRegistryServer(this.logger);
    this.config = this.initContext.config.get<CaseSuggestionRegistryConfig>();
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
