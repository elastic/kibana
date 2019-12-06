/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export interface ServerFacade {
  plugins: {
    alerting?: Legacy.Server['plugins']['alerting'];
    spaces: Legacy.Server['plugins']['spaces'];
  };
  route: Legacy.Server['route'];
}

export interface RequestFacade {
  auth: Legacy.Request['auth'];
  getAlertsClient?: Legacy.Request['getAlertsClient'];
  getActionsClient?: Legacy.Request['getActionsClient'];
  params: Legacy.Request['params'];
  payload: unknown;
  query: Legacy.Request['query'];
}
