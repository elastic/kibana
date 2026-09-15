/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import { registerRoutes } from '@kbn/server-route-repository';
import { EsqlViewsClient } from './lib/esql_views_client';
import { SourcesClient } from './lib/sources_client';
import { nightshiftSourcesRouteRepository } from './routes';
import { NIGHTSHIFT_SOURCE_SO_TYPE, nightshiftSourceSavedObjectType } from './saved_objects';
import type {
  GetSourcesClient,
  NightshiftSourcesServerSetup,
  NightshiftSourcesServerStart,
} from './types';

export class NightshiftSourcesPlugin
  implements Plugin<NightshiftSourcesServerSetup, NightshiftSourcesServerStart>
{
  private readonly logger: Logger;
  private readonly isDev: boolean;
  private coreStart?: CoreStart;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.isDev = context.env.mode.dev;
  }

  public setup(core: CoreSetup): NightshiftSourcesServerSetup {
    core.savedObjects.registerType(nightshiftSourceSavedObjectType);

    registerRoutes({
      repository: nightshiftSourcesRouteRepository,
      dependencies: {
        getSourcesClient: this.getSourcesClient,
      },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });
  }

  public start(core: CoreStart): NightshiftSourcesServerStart {
    this.coreStart = core;
    return {
      getSourcesClient: this.getSourcesClient,
    };
  }

  public stop() {}

  private getSourcesClient: GetSourcesClient = async ({ request }: { request: KibanaRequest }) => {
    const core = this.coreStart;
    if (!core) {
      throw new Error('Nightshift sources are not available before the plugin has started');
    }

    // The hidden type is not on the Nightshift feature's savedObject lists, so the saved objects
    // security extension would reject everyone but superusers. Route authz is the access check;
    // the spaces extension stays on so every call is scoped to the request's space.
    const soClient = core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [NIGHTSHIFT_SOURCE_SO_TYPE],
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });

    // Views live in the origin project. Validation and health probes read the data behind a
    // source, which under CPS may live in linked projects, so they route across all of them.
    const viewsEsClient = core.elasticsearch.client.asScoped(request).asCurrentUser;
    const dataEsClient = core.elasticsearch.client.asScoped(request, {
      projectRouting: 'expression',
      value: PROJECT_ROUTING_ALL,
    }).asCurrentUser;

    const username = core.security.authc.getCurrentUser(request)?.username ?? 'unknown';

    return new SourcesClient({
      soClient,
      viewsClient: new EsqlViewsClient(viewsEsClient),
      dataEsClient,
      logger: this.logger.get('sources'),
      username,
    });
  };
}
