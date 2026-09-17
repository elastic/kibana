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
import {
  NIGHTSHIFT_SOURCE_SO_TYPE,
  nightshiftSourceSavedObjectType,
} from './saved_objects/nightshift_source_saved_object';
import type {
  GetSourcesClient,
  NightshiftSourcesServerSetup,
  NightshiftSourcesServerStart,
} from './types';

const createSourcesClient = (
  core: CoreStart,
  request: KibanaRequest,
  logger: Logger
): SourcesClient => {
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

  return new SourcesClient({
    soClient,
    viewsClient: new EsqlViewsClient(viewsEsClient),
    dataEsClient,
    logger,
    username: core.security.authc.getCurrentUser(request)?.username ?? 'unknown',
  });
};

export class NightshiftSourcesPlugin
  implements Plugin<NightshiftSourcesServerSetup, NightshiftSourcesServerStart>
{
  private readonly logger: Logger;
  private readonly isDev: boolean;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
    this.isDev = context.env.mode.dev;
  }

  public setup(core: CoreSetup): NightshiftSourcesServerSetup {
    core.savedObjects.registerType(nightshiftSourceSavedObjectType);

    const getSourcesClient: GetSourcesClient = async ({ request }) => {
      const [coreStart] = await core.getStartServices();
      return createSourcesClient(coreStart, request, this.logger.get('sources'));
    };

    registerRoutes({
      repository: nightshiftSourcesRouteRepository,
      dependencies: { getSourcesClient },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });
  }

  public start(core: CoreStart): NightshiftSourcesServerStart {
    return {
      getSourcesClient: async ({ request }) =>
        createSourcesClient(core, request, this.logger.get('sources')),
    };
  }

  public stop() {}
}
