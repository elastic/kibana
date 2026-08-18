/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { registerRoutes } from './routes';
import { queryActivityFeature } from './query_activity_feature';
import { uiSettings } from './ui_settings';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class QueryActivityPlugin extends Service {
  static readonly inject = ['core.logger', 'core.capabilities', 'core.uiSettings', 'core.http', 'features.setup'];
  static readonly provide = 'queryActivity';

  constructor(ctx: Context) {
    super(ctx, 'queryActivity');
    const plugins = {
      features: (ctx.get('features.setup') as any).contract,
    };
    (ctx.get('core.logger') as any).get('plugins', 'queryActivity').debug('queryActivity: Setup');

        (ctx.get('core.capabilities') as any).registerProvider(() => ({
          management: {
            clusterPerformance: {
              queryActivity: true,
            },
          },
        }));

        plugins.features.registerKibanaFeature(queryActivityFeature);

        (ctx.get('core.uiSettings') as any).register(uiSettings);

        const router = (ctx.get('core.http') as any).createRouter();
        registerRoutes({ router, logger: (ctx.get('core.logger') as any).get('plugins', 'queryActivity') });
    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     this.logger.debug('queryActivity: Started');
    //     return {};
    //   }
  }
}
