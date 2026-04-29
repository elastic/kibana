/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import type { InboxConfig } from './config';
import type {
  InboxPluginSetup,
  InboxPluginStart,
  InboxSetupDependencies,
  InboxStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';

export class InboxPlugin
  implements
    Plugin<InboxPluginSetup, InboxPluginStart, InboxSetupDependencies, InboxStartDependencies>
{
  private readonly logger: Logger;
  private readonly config: InboxConfig;

  constructor(context: PluginInitializerContext<InboxConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<InboxStartDependencies, InboxPluginStart>,
    { features }: InboxSetupDependencies
  ): InboxPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Inbox plugin is disabled');
      return {};
    }

    this.logger.info('Setting up Inbox plugin');

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      order: 1100,
      category: DEFAULT_APP_CATEGORIES.security,
      app: ['kibana', PLUGIN_ID],
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: [PLUGIN_ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
        read: {
          app: ['kibana', PLUGIN_ID],
          api: [PLUGIN_ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
      },
    });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      logger: this.logger,
    });

    return {};
  }

  start(_core: CoreStart, _plugins: InboxStartDependencies): InboxPluginStart {
    return {};
  }

  stop() {}
}
