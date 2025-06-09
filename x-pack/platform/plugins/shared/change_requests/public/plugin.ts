/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { SecurityPluginSetup } from '@kbn/security-plugin-types-public';
import type { RouteRepositoryClient } from '@kbn/server-route-repository';
import { createRepositoryClient } from '@kbn/server-route-repository-client';
import type { ChangeRequestsRouteRepository } from '../server';

export type ChangeRequestsPluginSetup = ReturnType<ChangeRequestsPlugin['setup']>;
export type ChangeRequestsPluginStart = ReturnType<ChangeRequestsPlugin['start']>;

export type ChangeRequestsRepositoryClient = RouteRepositoryClient<
  ChangeRequestsRouteRepository,
  {}
>;

interface PluginSetupDependencies {
  security: SecurityPluginSetup;
}

export class ChangeRequestsPlugin
  implements Plugin<ChangeRequestsPluginSetup, ChangeRequestsPluginStart>
{
  private repositoryClient!: ChangeRequestsRepositoryClient;

  public setup(core: CoreSetup, { security }: PluginSetupDependencies) {
    this.repositoryClient = createRepositoryClient(core);
    security.registerChangeRequestsRepositoryClient(this.repositoryClient);
    return {};

    // TODO: I think it would be nice to have a widget in the top chrome and the home page to notify you about changes to change requests
  }

  public start() {
    return {
      changeRequestsRepositoryClient: this.repositoryClient,
    };
  }
}
