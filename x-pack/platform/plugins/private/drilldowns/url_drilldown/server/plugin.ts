/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { URL_DRILLDOWN_SUPPORTED_TRIGGERS, URL_DRILLDOWN_TYPE } from '../common/constants';
import { urlDrilldownSchema } from './schemas';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class UrlDrilldownPlugin extends Service {
  static readonly inject = ['embeddable.setup'];
  static readonly provide = 'urlDrilldown';

  constructor(ctx: Context) {
    super(ctx, 'urlDrilldown');
    const embeddable = (ctx.get('embeddable.setup') as any).contract;
    embeddable.registerDrilldown(URL_DRILLDOWN_TYPE, {
          schema: urlDrilldownSchema,
          supportedTriggers: URL_DRILLDOWN_SUPPORTED_TRIGGERS,
        });
  }
}
