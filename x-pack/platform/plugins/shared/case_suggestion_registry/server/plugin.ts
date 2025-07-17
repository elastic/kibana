/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext, Plugin as PluginType } from '@kbn/core/server';
import { Registry } from './services/case_suggestion_registry';
import { CaseSuggestionRegistryConfig } from '../common/config';

export interface CaseSuggestionRegistryServerSetup {
  config: CaseSuggestionRegistryConfig;
  registry: Registry;
}

export interface CaseSuggestionRegistryServerStart {
  config: CaseSuggestionRegistryConfig;
  registry: Registry;
}

export class CaseSuggestionRegistryPlugin implements PluginType {
  private config: CaseSuggestionRegistryConfig;
  private registry: Registry;

  constructor(
    private readonly initContext: PluginInitializerContext<CaseSuggestionRegistryConfig>
  ) {
    this.registry = new Registry();
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
