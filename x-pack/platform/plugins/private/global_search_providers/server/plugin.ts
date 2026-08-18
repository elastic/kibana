/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { createSavedObjectsResultProvider } from './providers';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class GlobalSearchProvidersPlugin extends Service {
  static readonly inject = ['globalSearch.setup'];
  static readonly provide = 'globalSearchProviders';

  constructor(ctx: Context) {
    super(ctx, 'globalSearchProviders');
    const globalSearch = (ctx.get('globalSearch.setup') as any).contract;
    globalSearch.registerResultProvider(createSavedObjectsResultProvider());
  }
}
