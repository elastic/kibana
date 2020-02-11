/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export interface ServerFacade {
  config: Legacy.Server['config'];
  usingEphemeralEncryptionKey: boolean;
  plugins: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    actions: any; // We have to do this at the moment because the types are not compatible
    alerting?: Legacy.Server['plugins']['alerting'];
    elasticsearch: Legacy.Server['plugins']['elasticsearch'];
    spaces: Legacy.Server['plugins']['spaces'];
    savedObjects: Legacy.Server['savedObjects']['SavedObjectsClient'];
  };
  route: Legacy.Server['route'];
}

export interface RequestFacade {
  auth: Legacy.Request['auth'];
  getAlertsClient?: Legacy.Request['getAlertsClient'];
  getActionsClient?: Legacy.Request['getActionsClient'];
  getSavedObjectsClient?: Legacy.Request['getSavedObjectsClient'];
  headers: Legacy.Request['headers'];
  method: Legacy.Request['method'];
  params: Legacy.Request['params'];
  payload: unknown;
  query: Legacy.Request['query'];
}
