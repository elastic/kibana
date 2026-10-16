/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, HttpServiceSetup, KibanaRequest, Logger } from '@kbn/core/server';

import type { ActionsConfigurationUtilities } from '../actions_config';
import type { InMemoryConnector } from '../types';
import type { InboundEventsClient } from './client';
import { dispatchConnectorEvents } from './dispatch_connector_events';
import { createInboundEventsClient } from './factory';
import { InboundEventAdmission } from './inbound_event_admission';
import { InboundEventRateLimiter } from './inbound_event_rate_limiter';
import {
  registerInboundEventAdmission,
  registerInboundEventSizeOutcome,
} from './register_inbound_event_admission';
import type { ConnectorEventEmitter } from './types';

export interface SetupInboundEventsParams {
  actionsConfigUtils: ActionsConfigurationUtilities;
  http: HttpServiceSetup;
  getStartServices: CoreSetup['getStartServices'];
  logger: Logger;
  spaces?: {
    spacesService: {
      getSpaceId: (request: KibanaRequest) => string;
    };
  };
  inMemoryConnectors: InMemoryConnector[];
  getConnectorEventEmitter: () => ConnectorEventEmitter | undefined;
}

/** Route deps for the inbound events hub. Absent when the feature is disabled. */
export interface InboundEventsSetup {
  maxBodyBytes: number;
  client: InboundEventsClient;
  getSpaceId: (request: KibanaRequest) => string;
}

/** Registers inbound event admission and returns the hub route deps when the feature is enabled. */
export function setupInboundEvents({
  actionsConfigUtils,
  http,
  getStartServices,
  logger,
  spaces,
  inMemoryConnectors,
  getConnectorEventEmitter,
}: SetupInboundEventsParams): InboundEventsSetup | undefined {
  if (!actionsConfigUtils.isInboundEventsEnabled()) {
    return undefined;
  }

  const getSpaceId = (request: KibanaRequest): string =>
    spaces?.spacesService.getSpaceId(request) ?? 'default';

  registerInboundEventSizeOutcome({ http, logger, getSpaceId });

  const admissionConfig = actionsConfigUtils.getInboundEventsAdmission();
  if (admissionConfig.enabled) {
    registerInboundEventAdmission({
      http,
      logger,
      admission: new InboundEventAdmission(admissionConfig),
      config: admissionConfig,
      maxBodyBytes: actionsConfigUtils.getInboundEventsMaxBodyBytes(),
      getSpaceId,
    });
  }

  return {
    maxBodyBytes: actionsConfigUtils.getInboundEventsMaxBodyBytes(),
    client: createInboundEventsClient({
      logger,
      inboundEventsEnabled: true,
      isActionTypeEnabled: (actionTypeId) => actionsConfigUtils.isActionTypeEnabled(actionTypeId),
      maxEmitted: actionsConfigUtils.getInboundEventsMaxEmitted(),
      maxBodyBytes: actionsConfigUtils.getInboundEventsMaxBodyBytes(),
      getStartServices,
      inMemoryConnectors,
      rateLimiter: new InboundEventRateLimiter(actionsConfigUtils.getInboundEventsRateLimit()),
      emitConnectorEvents: (params) =>
        dispatchConnectorEvents({
          emitter: getConnectorEventEmitter(),
          params,
        }),
    }),
    getSpaceId,
  };
}
