/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { feedbackSubmittedEventType } from './src';
import { registerSendFeedbackRoute } from './routes';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class FeedbackPlugin extends Service {
  static readonly inject = ['core.analytics', 'core.http'];
  static readonly provide = 'feedback';

  constructor(ctx: Context) {
    super(ctx, 'feedback');
    (ctx.get('core.analytics') as any).registerEventType(feedbackSubmittedEventType);

        const router = (ctx.get('core.http') as any).createRouter();
        registerSendFeedbackRoute(router, (ctx.get('core.analytics') as any));
  }
}
