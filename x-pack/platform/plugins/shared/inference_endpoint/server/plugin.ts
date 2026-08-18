/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { getInferenceServicesRoute } from './routes';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class InferenceEndpointPlugin extends Service {
  static readonly inject = ['core.http'];
  static readonly provide = 'inferenceEndpoint';

  constructor(ctx: Context) {
    super(ctx, 'inferenceEndpoint');
    (ctx.get('core.logger') as any).get('plugins', 'inferenceEndpoint').debug('inference-endpoint: Setup');
        const router = (ctx.get('core.http') as any).createRouter();

        // Register server side APIs
        getInferenceServicesRoute(router, (ctx.get('core.logger') as any).get('plugins', 'inferenceEndpoint'));
    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     this.logger.debug('inference-endpoint: Started');
    //     return {};
    //   }
  }
}
