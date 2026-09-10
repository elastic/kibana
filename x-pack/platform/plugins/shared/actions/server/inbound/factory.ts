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
import { createUnsecuredInboundSavedObjectsClient } from './create_unsecured_inbound_saved_objects_client';
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
  });
}
