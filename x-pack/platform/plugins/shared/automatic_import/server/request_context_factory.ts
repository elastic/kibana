/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type {
  AutomaticImportPluginApiRequestHandlerContext,
  AutomaticImportPluginCoreSetupDependencies,
  AutomaticImportPluginRequestHandlerContext,
  AutomaticImportPluginSetupDependencies,
} from './types';
import type { AutomaticImportService } from './services';
import { MINIMUM_LICENSE_TYPE } from '../common/constants';

export interface IRequestContextFactory {
  create(
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<AutomaticImportPluginApiRequestHandlerContext>;
}

interface ConstructorOptions {
  logger: Logger;
  core: AutomaticImportPluginCoreSetupDependencies;
  plugins: AutomaticImportPluginSetupDependencies;
  kibanaVersion: string;
  automaticImportService: AutomaticImportService;
  getProductTierAllowsAutomaticImport: () => boolean;
}

export class RequestContextFactory implements IRequestContextFactory {
  private readonly logger: Logger;

  constructor(private readonly options: ConstructorOptions) {
    this.logger = options.logger;
  }

  public async create(
    context: Omit<AutomaticImportPluginRequestHandlerContext, 'automaticImport'>,
    request: KibanaRequest
  ): Promise<AutomaticImportPluginApiRequestHandlerContext> {
    const { options } = this;
    const { core } = options;

    const [coreStart, startPlugins] = await core.getStartServices();
    const coreContext = await context.core;

    const getSpaceId = (): string =>
      startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_NAMESPACE_STRING;

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const internalEsClient = coreStart.elasticsearch.client.asInternalUser;
    const fieldsMetadataClient = await startPlugins.fieldsMetadata.getClient(request);
    const { license } = await context.licensing;

    const reportTelemetryEvent = <TEventType extends string>(
      eventType: TEventType,
      eventData: Record<string, unknown>
    ) => {
      core.analytics.reportEvent(eventType, eventData);
    };

    return {
      core: coreContext,
      actions: startPlugins.actions,
      logger: this.logger,
      getServerBasePath: () => core.http.basePath.serverBasePath,
      getSpaceId,
      getCurrentUser: async () => {
        const user = await coreContext.security.authc.getCurrentUser();
        if (!user) {
          throw new Error('Current authenticated user not found');
        }
        return user;
      },
      automaticImportService: this.options.automaticImportService,
      inference: startPlugins.inference,
      savedObjectsClient,
      esClient,
      internalEsClient,
      fieldsMetadataClient,
      reportTelemetryEvent,
      isAvailable: () =>
        this.options.getProductTierAllowsAutomaticImport() &&
        license.hasAtLeast(MINIMUM_LICENSE_TYPE),
    };
  }
}
