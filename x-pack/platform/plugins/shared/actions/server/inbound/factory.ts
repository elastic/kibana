/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';

import type { InMemoryConnector } from '../types';
import type { InboundEventsClient } from './client';
import { buildInboundEventsClient } from './client';
import { authorizeKibanaInboundRequest } from './authorize_kibana_inbound_request';
import { createUnsecuredInboundSavedObjectsClient } from './create_unsecured_inbound_saved_objects_client';
import { getDecryptedInboundConnector } from './get_decrypted_inbound_connector';
import type { InboundEventRateLimiter } from './inbound_event_rate_limiter';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';

export type { InboundEventsClient } from './client';

/**
 * Public setup-time inputs for {@link createInboundEventsClient}.
 * The factory binds `getStartServices` into a space-scoped SO client factory; callers do not pass SO clients.
 */
export interface InboundEventsClientArgs {
  logger: Logger;
  inboundEventsEnabled: boolean;
  isActionTypeEnabled: (actionTypeId: string) => boolean;
  maxEmitted: number;
  maxBodyBytes: number;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  getStartServices: CoreSetup['getStartServices'];
  rateLimiter: InboundEventRateLimiter;
  inMemoryConnectors: InMemoryConnector[];
}

/**
 * Builds an inbound events client with shared deps (logger, emitter, config, SO factory).
 */
export function createInboundEventsClient(args: InboundEventsClientArgs): InboundEventsClient {
  const { getStartServices, ...rest } = args;
  return buildInboundEventsClient({
    ...rest,
    getUnsecuredSavedObjectsClient: (spaceId) =>
      createUnsecuredInboundSavedObjectsClient({ getStartServices, spaceId }),
    getDecryptedConnectorAttributes: (connectorId, spaceId) =>
      getDecryptedInboundConnector({ getStartServices, connectorId, spaceId }),
    getElasticsearchClient: async () => {
      const [coreStart] = await getStartServices();
      return coreStart.elasticsearch.client;
    },
    getKibanaRequestAccess: (request) => authorizeKibanaInboundRequest(request, getStartServices),
  });
}
