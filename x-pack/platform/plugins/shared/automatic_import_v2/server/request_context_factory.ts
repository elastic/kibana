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

    const getCurrentUser = async () => {
      let contextUser = coreContext.security.authc.getCurrentUser();

      if (contextUser && !contextUser?.profile_uid) {
        try {
          const users = await coreContext.elasticsearch.client.asCurrentUser.security.getUser({
            username: contextUser.username,
            with_profile_uid: true,
          });

          if (users[contextUser.username].profile_uid) {
            contextUser = { ...contextUser, profile_uid: users[contextUser.username].profile_uid };
          }
        } catch (e) {
          this.logger.error(`Failed to get user profile_uid: ${e}`);
        }
      }

      return contextUser;
    };

    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    return {
      core: coreContext,
      actions: startPlugins.actions,
      logger: this.logger,
      getServerBasePath: () => core.http.basePath.serverBasePath,
      getSpaceId,
      getCurrentUser,
      checkPrivileges: () => {
        return startPlugins.security.authz.checkPrivilegesWithRequest(request);
      },
      inference: startPlugins.inference,
      savedObjectsClient,
    };
  }
}
