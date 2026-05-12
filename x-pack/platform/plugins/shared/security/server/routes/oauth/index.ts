/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineCreateOAuthClientRoute } from './create_client';
import { defineGetOAuthClientRoute } from './get_client';
import { defineGetOAuthConnectionRoute } from './get_connection';
import { defineListOAuthClientsRoute } from './list_clients';
import { defineListOAuthConnectionsRoute } from './list_connections';
import { defineRevokeOAuthClientRoute } from './revoke_client';
import { defineRevokeOAuthConnectionRoute } from './revoke_connection';
import { defineUpdateOAuthClientRoute } from './update_client';
import { defineUpdateOAuthConnectionRoute } from './update_connection';
import type { RouteDefinitionParams } from '..';

export function defineOAuthRoutes(params: RouteDefinitionParams) {
  defineCreateOAuthClientRoute(params);
  defineGetOAuthClientRoute(params);
  defineListOAuthClientsRoute(params);
  defineUpdateOAuthClientRoute(params);
  defineRevokeOAuthClientRoute(params);
  defineGetOAuthConnectionRoute(params);
  defineListOAuthConnectionsRoute(params);
  defineUpdateOAuthConnectionRoute(params);
  defineRevokeOAuthConnectionRoute(params);
}
