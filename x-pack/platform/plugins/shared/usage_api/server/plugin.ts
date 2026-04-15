/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { UsageApiConfigType } from './config';
import { UsageReportingService } from './usage_reporting';

/**
 * Setup contract
 */
export interface UsageApiSetup {
  /**
   * Configuration for the Usage API.
   */
  config: UsageApiConfigType;
  /**
   * Usage reporting service for reporting usage metrics.
   * Only exposed if usage reporting is enabled and available.
   */
  usageReporting?: UsageReportingService;
}

/**
 * Start contract
 */
export interface UsageApiStart {
  /**
   * Usage reporting service for reporting usage metrics.
   * Only exposed if usage reporting is enabled and available.
   */
  usageReporting?: UsageReportingService;
}

export class UsageApiPlugin implements Plugin<UsageApiSetup, UsageApiStart> {
  private readonly config: UsageApiConfigType;
  private readonly logger: Logger;
  private usageReporting?: UsageReportingService;

  constructor(private readonly context: PluginInitializerContext) {
    this.config = this.context.config.get<UsageApiConfigType>();
    this.logger = this.context.logger.get();
  }

  public setup(): UsageApiSetup {
    const kibanaVersion = this.context.env.packageInfo.version;
    const enabled = this.config.enabled && !!this.config.url;
    if (enabled) {
      this.usageReporting = new UsageReportingService({
        config: this.config,
        kibanaVersion,
        logger: this.logger.get('usageReporting'),
      });
    }
    return {
      config: {
        enabled: this.config.enabled && !!this.config.url,
        url: this.config.url,
        tls: this.config.tls,
      },
      usageReporting: this.usageReporting,
    };
  }

  public start(): UsageApiStart {
    return {
      usageReporting: this.usageReporting,
    };
  }
}
