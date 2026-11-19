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
  type KibanaRequest,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import {
  INBOX_API_PRIVILEGE_READ,
  INBOX_API_PRIVILEGE_RESPOND,
  PLUGIN_ID,
  PLUGIN_NAME,
} from '../common';
import type { InboxConfig } from './config';
import type {
  InboxPluginSetup,
  InboxPluginStart,
  InboxSetupDependencies,
  InboxStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { InboxActionRegistry } from './services/inbox_action_registry';
import type { InboxActionProvider } from './services/inbox_action_provider';

/**
 * Resolves the active space id for a request. The routes accept this as a
 * dependency so that (a) we never silently default to `'default'` and leak
 * cross-space rows, and (b) tests can inject a fixed resolver without
 * pulling in the full spaces plugin.
 */
export type InboxSpaceIdResolver = (request: KibanaRequest) => string;

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
      return {
        registerActionProvider: (_provider: InboxActionProvider) => {
          // No-op so providers can unconditionally call this in their own setup().
        },
      };
    }

    this.logger.info('Setting up Inbox plugin');

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      order: 1100,
      category: DEFAULT_APP_CATEGORIES.security,
      app: ['kibana', PLUGIN_ID],
      // `all` grants both the read (list) and the respond (write) API
      // privileges; `read` grants only the read privilege. This prevents a
      // read-only user from invoking the POST respond route — before the
      // split both privileges shared a single `api: [PLUGIN_ID]` entry.
      privileges: {
        all: {
          app: ['kibana', PLUGIN_ID],
          api: [INBOX_API_PRIVILEGE_READ, INBOX_API_PRIVILEGE_RESPOND],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show', 'respond'],
        },
        read: {
          app: ['kibana', PLUGIN_ID],
          api: [INBOX_API_PRIVILEGE_READ],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['show'],
        },
      },
    });

    const registry = new InboxActionRegistry(this.logger);

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      logger: this.logger,
      registry,
      getSpaceId: (request) => this.getSpaceId(request),
    });

    return {
      registerActionProvider: (provider) => registry.register(provider),
    };
  }

  private spaces?: InboxStartDependencies['spaces'];

  private getSpaceId(request: KibanaRequest): string {
    // When the spaces plugin is available (default in Kibana / serverless)
    // resolve the active space for this request. When it isn't, Kibana is
    // running single-space so `'default'` is the only possible answer and
    // providers will receive a truthful value.
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  start(_core: CoreStart, plugins: InboxStartDependencies): InboxPluginStart {
    this.spaces = plugins.spaces;
    return {};
  }

  stop() {}
}
