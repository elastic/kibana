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
} from '../../../../../../src/core/server';
import { ActionsClient } from '../../../../../plugins/actions/server';
import { AlertsClient } from '../../../../../legacy/plugins/alerting/server';
import { SpacesServiceSetup } from '../../../../../plugins/spaces/server';
import { CoreStart, StartPlugins } from '../plugin';

export interface Clients {
  actionsClient?: ActionsClient;
  clusterClient: IScopedClusterClient;
  spacesClient: { getSpaceId: () => string };
  savedObjectsClient: SavedObjectsClientContract;
}
interface LegacyClients {
  alertsClient?: AlertsClient;
}
export type GetScopedClients = (request: LegacyRequest) => Promise<Clients & LegacyClients>;

export class ClientsService {
  private actions?: StartPlugins['actions'];
  private clusterClient?: IClusterClient;
  private savedObjects?: CoreStart['savedObjects'];
  private spacesService?: SpacesServiceSetup;

  public setup(clusterClient: IClusterClient, spacesService?: SpacesServiceSetup) {
    this.clusterClient = clusterClient;
    this.spacesService = spacesService;
  }

  public start(savedObjects: CoreStart['savedObjects'], actions: StartPlugins['actions']) {
    this.savedObjects = savedObjects;
    this.actions = actions;
  }

  public createGetScoped(): GetScopedClients {
    if (!this.clusterClient || !this.savedObjects) {
      throw new Error('Services not initialized');
    }

    return async (request: LegacyRequest) => {
      const kibanaRequest = KibanaRequest.from(request);

      return {
        alertsClient: request.getAlertsClient?.(),
        actionsClient: await this.actions?.getActionsClientWithRequest?.(kibanaRequest),
        clusterClient: this.clusterClient!.asScoped(kibanaRequest),
        savedObjectsClient: this.savedObjects!.getScopedClient(kibanaRequest),
        spacesClient: {
          getSpaceId: () => this.spacesService?.getSpaceId?.(kibanaRequest) ?? 'default',
        },
      };
    };
  }
}
