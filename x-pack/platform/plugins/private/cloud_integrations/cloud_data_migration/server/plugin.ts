/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { PLUGIN_ID } from '../common';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class CloudDataMigrationPlugin extends Service {
  static readonly inject = ['features.setup'];
  static readonly provide = 'cloudDataMigration';

  constructor(ctx: Context) {
    super(ctx, 'cloudDataMigration');
    const features = (ctx.get('features.setup') as any).contract;
    features.registerElasticsearchFeature({
          id: PLUGIN_ID,
          management: {
            data: [PLUGIN_ID],
          },
          privileges: [
            {
              requiredClusterPrivileges: ['manage'],
              ui: [],
            },
          ],
        });
  }
}
