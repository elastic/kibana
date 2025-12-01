/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, RequestHandlerContext } from '@kbn/core/server';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import type {
  AutomaticImportV2PluginApiRequestHandlerContext,
  AutomaticImportV2PluginCoreSetupDependencies,
  AutomaticImportV2PluginRequestHandlerContext,
  AutomaticImportV2PluginSetupDependencies,
} from './types';
import type { AutomaticImportService } from './services';

export interface IRequestContextFactory {
  create(
    context: RequestHandlerContext,
    request: KibanaRequest
  ): Promise<AutomaticImportV2PluginApiRequestHandlerContext>;
}

interface ConstructorOptions {
  logger: Logger;
  core: AutomaticImportV2PluginCoreSetupDependencies;
  plugins: AutomaticImportV2PluginSetupDependencies;
  kibanaVersion: string;
  automaticImportService: AutomaticImportService;
}

export class RequestContextFactory implements IRequestContextFactory {
  private readonly logger: Logger;

  constructor(private readonly options: ConstructorOptions) {
    this.logger = options.logger;
  }

  public async create(
    context: Omit<AutomaticImportV2PluginRequestHandlerContext, 'automaticImportv2'>,
    request: KibanaRequest
  ): Promise<AutomaticImportV2PluginApiRequestHandlerContext> {
    const { options } = this;
    const { core } = options;

    const [coreStart, startPlugins] = await core.getStartServices();
    const coreContext = await context.core;

    const getSpaceId = (): string =>
      startPlugins.spaces?.spacesService?.getSpaceId(request) || DEFAULT_NAMESPACE_STRING;

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    return {
      core: coreContext,
      actions: startPlugins.actions,
      logger: this.logger,
      getServerBasePath: () => core.http.basePath.serverBasePath,
      getSpaceId,
      getCurrentUser: async () => coreContext.security.authc.getCurrentUser(),
      automaticImportService: this.options.automaticImportService,
      inference: startPlugins.inference,
      savedObjectsClient,
    };
  }
}
