/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IClusterClient,
  IScopedClusterClient,
  KibanaRequest,
  LegacyRequest,
  SavedObjectsClientContract,
} from '../../../../../src/core/server';
import { ActionsClient } from '../../../../plugins/actions/server';
import { AlertsClient } from '../../../../legacy/plugins/alerting/server';
import { CoreStart, LegacySetupServices, StartPlugins, SetupPlugins } from './plugin';

export interface SiemServices {
  actionsClient?: ActionsClient;
  callCluster: IScopedClusterClient['callAsCurrentUser'];
  getSpaceId: () => string | undefined;
  savedObjectsClient: SavedObjectsClientContract;
}
interface LegacySiemServices {
  alertsClient?: AlertsClient;
  config: LegacySetupServices['config'];
}
export type ScopedServices = SiemServices & LegacySiemServices;
export type LegacyGetScopedServices = (request: LegacyRequest) => Promise<ScopedServices>;

export class Services {
  private actions?: StartPlugins['actions'];
  private clusterClient?: IClusterClient;
  private config?: LegacySetupServices['config'];
  private savedObjects?: CoreStart['savedObjects'];
  private spacesService?: SetupPlugins['spaces']['spacesService'];

  public setup(
    clusterClient: IClusterClient,
    spacesService: SetupPlugins['spaces']['spacesService'],
    config: LegacySetupServices['config']
  ) {
    this.clusterClient = clusterClient;
    this.spacesService = spacesService;
    this.config = config;
  }

  public start(savedObjects: CoreStart['savedObjects'], actions: StartPlugins['actions']) {
    this.savedObjects = savedObjects;
    this.actions = actions;
  }

  public getScopedServicesFactory(): LegacyGetScopedServices {
    if (!this.clusterClient || !this.savedObjects) {
      throw new Error('Services not initialized');
    }

    return async (request: LegacyRequest) => {
      const kibanaRequest = KibanaRequest.from(request);

      return {
        alertsClient: request.getAlertsClient?.(),
        actionsClient: await this.actions?.getActionsClientWithRequest?.(kibanaRequest),
        callCluster: this.clusterClient!.asScoped(kibanaRequest).callAsCurrentUser,
        config: this.config!,
        getSpaceId: () => this.spacesService?.getSpaceId?.(kibanaRequest),
        savedObjectsClient: this.savedObjects!.getScopedClient(kibanaRequest),
      };
    };
  }
}
