/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';
import { SpacesClient } from './server/lib/spaces_client';

export interface SpacesPlugin {
  getSpaceId(request: Record<string, any>): string;
  spacesClient: {
    getScopedClient(request: Legacy.Request): SpacesClient;
  };
}
