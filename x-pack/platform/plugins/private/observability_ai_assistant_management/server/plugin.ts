/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { uiSettings } from '../common/ui_settings';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class AiAssistantManagementPlugin extends Service {
  static readonly inject = ['core.uiSettings'];
  static readonly provide = 'observabilityAiAssistantManagement';

  constructor(ctx: Context) {
    super(ctx, 'observabilityAiAssistantManagement');
    (ctx.get('core.uiSettings') as any).register(uiSettings);
  }
}
