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
import { CoreStart, StartPlugins, SetupPlugins } from '../plugin';

export interface ClientServices {
  actionsClient?: ActionsClient;
  callCluster: IScopedClusterClient['callAsCurrentUser'];
  getSpaceId: () => string | undefined;
  savedObjectsClient: SavedObjectsClientContract;
}
interface LegacyClientServices {
  alertsClient?: AlertsClient;
}
export type GetScopedClientServices = (
  request: LegacyRequest
) => Promise<ClientServices & LegacyClientServices>;

export class ClientsService {
  private actions?: StartPlugins['actions'];
  private clusterClient?: IClusterClient;
  private savedObjects?: CoreStart['savedObjects'];
  private spacesService?: SetupPlugins['spaces']['spacesService'];

  public setup(
    clusterClient: IClusterClient,
    spacesService: SetupPlugins['spaces']['spacesService']
  ) {
    this.clusterClient = clusterClient;
    this.spacesService = spacesService;
  }

  public start(savedObjects: CoreStart['savedObjects'], actions: StartPlugins['actions']) {
    this.savedObjects = savedObjects;
    this.actions = actions;
  }

  public getScopedFactory(): GetScopedClientServices {
    if (!this.clusterClient || !this.savedObjects) {
      throw new Error('Services not initialized');
    }

    return async (request: LegacyRequest) => {
      const kibanaRequest = KibanaRequest.from(request);

      return {
        alertsClient: request.getAlertsClient?.(),
        actionsClient: await this.actions?.getActionsClientWithRequest?.(kibanaRequest),
        callCluster: this.clusterClient!.asScoped(kibanaRequest).callAsCurrentUser,
        getSpaceId: () => this.spacesService?.getSpaceId?.(kibanaRequest),
        savedObjectsClient: this.savedObjects!.getScopedClient(kibanaRequest),
      };
    };
  }
}
