/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { getClusterUuids } from '@kbn/telemetry-plugin/server';
import { getStatsWithXpack } from './telemetry_collection';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class TelemetryCollectionXpackPlugin extends Service {
  static readonly inject = ['telemetryCollectionManager.setup'];
  static readonly provide = 'telemetryCollectionXpack';

  constructor(ctx: Context) {
    super(ctx, 'telemetryCollectionXpack');
    const telemetryCollectionManager = (ctx.get('telemetryCollectionManager.setup') as any).contract;
    telemetryCollectionManager.setCollectionStrategy({
      title: 'local_xpack',
      priority: 1,
      statsGetter: getStatsWithXpack,
      clusterDetailsGetter: getClusterUuids,
    });
  }
}
