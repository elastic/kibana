/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { registerRoutes } from './routes';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class LogstashPlugin extends Service {
  static readonly inject = ['core.logger', 'core.http', 'features.setup'];
  static readonly provide = 'logstash';

  constructor(ctx: Context) {
    super(ctx, 'logstash');
    const deps = {
      features: (ctx.get('features.setup') as any).contract,
    };
    (ctx.get('core.logger') as any).get('plugins', 'logstash').debug('Setting up Logstash plugin');

        registerRoutes((ctx.get('core.http') as any).createRouter());

        deps.features.registerElasticsearchFeature({
          id: 'pipelines',
          management: {
            ingest: ['pipelines'],
          },
          privileges: [
            {
              requiredClusterPrivileges: ['manage_logstash_pipelines'],
              requiredIndexPrivileges: {},
              ui: [],
            },
          ],
        });
  }
}
