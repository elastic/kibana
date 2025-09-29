/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { registerStreamsUsageCollector } from './streams_usage_collector';

export class StatsTelemetryService {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public setup(usageCollection?: UsageCollectionSetup) {
    if (usageCollection) {
      this.logger.debug('[Streams Stats Telemetry Service] Setting up streams usage collector');
      registerStreamsUsageCollector(usageCollection);
    } else {
      this.logger.debug(
        '[Streams Stats Telemetry Service] Usage collection not available, skipping setup'
      );
    }
  }
}
