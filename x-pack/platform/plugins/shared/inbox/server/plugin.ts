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
import {
  installStaticWatchWorkflows,
  registerManagedWatchWorkflowOwner,
} from './managed_workflows';
import { WatchWorkflowProjectionService } from './services/watches/watch_workflow_projection_service';
import type { WatchWorkflowsManagementClient } from './services/watches/watch_workflows_management_client';
import { InvestigationProjectionService } from './services/investigations/investigation_projection_service';

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
  private watchProjection?: WatchWorkflowProjectionService;
  private investigationProjection?: InvestigationProjectionService;

  constructor(context: PluginInitializerContext<InboxConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<InboxStartDependencies, InboxPluginStart>,
    { features, workflowsExtensions }: InboxSetupDependencies
  ): InboxPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('Inbox plugin is disabled');
      return {
        registerActionProvider: (_provider: InboxActionProvider) => {
          // No-op so providers can unconditionally call this in their own setup().
        },
        registerWatchWorkflowsClient: (_client: WatchWorkflowsManagementClient) => {
          // No-op when disabled.
        },
      };
    }

    this.logger.info('Setting up Inbox plugin');

    registerManagedWatchWorkflowOwner({ workflowsExtensions });

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      order: 1100,
      category: DEFAULT_APP_CATEGORIES.security,
      app: ['kibana', PLUGIN_ID],
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
      getWatchProjection: () => this.watchProjection,
      getInvestigationProjection: () => this.investigationProjection,
    });

    return {
      registerActionProvider: (provider) => registry.register(provider),
      registerWatchWorkflowsClient: (client) => {
        this.watchProjection = new WatchWorkflowProjectionService(client, this.logger);
        this.logger.info('Watch workflow projection client registered');
      },
    };
  }

  private spaces?: InboxStartDependencies['spaces'];

  private getSpaceId(request: KibanaRequest): string {
    return this.spaces?.spacesService.getSpaceId(request) ?? 'default';
  }

  start(core: CoreStart, plugins: InboxStartDependencies): InboxPluginStart {
    this.spaces = plugins.spaces;

    this.investigationProjection = new InvestigationProjectionService({
      getEsClient: (request) => core.elasticsearch.client.asScoped(request).asInternalUser,
      getSpaceId: (request) => this.getSpaceId(request),
    });
    this.logger.info('Investigation projection service registered');

    if (this.config.enabled) {
      void installStaticWatchWorkflows({
        enabled: true,
        workflowsExtensions: plugins.workflowsExtensions,
        logger: this.logger,
      }).then(({ failedIds }) => {
        if (failedIds.length) {
          this.logger.warn(
            `Inbox watch managed workflow install completed with failures: ${failedIds.join(', ')}`
          );
        } else {
          this.logger.info('Inbox watch managed workflows installed');
        }
      });
    }

    return {};
  }

  stop() {}
}
