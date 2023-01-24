/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';
import { registerRoutes } from './routes';

export interface TestPluginDepsSetup {
  usageCollection: UsageCollectionSetup;
}

export class UsageCollectionTestPlugin implements Plugin {
  private usageCounter?: UsageCounter;

  public setup(core: CoreSetup, { usageCollection }: TestPluginDepsSetup) {
    const usageCounter = usageCollection.createUsageCounter('usageCollectionTestPlugin');

    registerRoutes(core.http, usageCounter);
    usageCounter.incrementCounter({
      counterName: 'duringSetup',
      incrementBy: 10,
    });
    usageCounter.incrementCounter({ counterName: 'duringSetup' });
    this.usageCounter = usageCounter;
  }

  public start() {
    if (!this.usageCounter) {
      throw new Error('this.usageCounter is expected to be defined during setup.');
    }
    this.usageCounter.incrementCounter({ counterName: 'duringStart' });
  }

  public stop() {}
}
