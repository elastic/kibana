/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import { CaseSuggestionRegistryBrowserConfig } from '../common/config';
import { Registry } from './services/case_suggestion_registry';

export type CaseSuggestionRegistryPublicSetup = ReturnType<CaseSuggestionRegistryPlugin['setup']>;
export type CaseSuggestionRegistryPublicStart = ReturnType<CaseSuggestionRegistryPlugin['start']>;

export class CaseSuggestionRegistryPlugin implements Plugin {
  private config: CaseSuggestionRegistryBrowserConfig;
  private registry: Registry;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<CaseSuggestionRegistryBrowserConfig>();
    this.registry = new Registry();
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
