/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, PluginInitializerContext } from '@kbn/core/server';

import type { UsageApiConfigType } from './config';

/**
 * Setup contract
 */
export interface UsageApiSetup {
  /**
   * Configuration for the Usage API.
   */
  config: UsageApiConfigType;
}

/**
 * Start contract
 */
export type UsageApiStart = void;

export class UsageApiPlugin implements Plugin<UsageApiSetup, UsageApiStart> {
  private readonly config: UsageApiConfigType;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get<UsageApiConfigType>();
  }

  public setup(): UsageApiSetup {
    return {
      config: {
        enabled: this.config.enabled && !!this.config.url,
        url: this.config.url,
        tls: this.config.tls,
      },
    };
  }

  public start(): UsageApiStart {}
}
