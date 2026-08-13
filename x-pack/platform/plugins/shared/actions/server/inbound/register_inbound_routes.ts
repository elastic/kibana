/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CONNECTOR_TYPE_ID_LENGTH } from '@kbn/connector-specs';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { asSpaceId } from '@kbn/core-spaces-common';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import type { CoreSetup, IRouter, KibanaRequest, Logger } from '@kbn/core/server';

import { CONNECTOR_ID_MAX_LENGTH } from '../../common';
import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import type { ActionsRequestHandlerContext, InMemoryConnector } from '../types';
import {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_API_VERSION,
  INBOUND_EVENTS_SECURITY,
  INBOUND_EVENTS_TOKEN_MAX_LENGTH,
} from './constants';
import { handleInboundRequest } from './handle_inbound_request';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';

export interface RegisterInboundRoutesParams {
  router: IRouter<ActionsRequestHandlerContext>;
  inboundEventsEnabled: boolean;
  maxBodyBytes: number;
  maxEmitted: number;
  logger: Logger;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  getStartServices: CoreSetup['getStartServices'];
  getSpaceId: (request: KibanaRequest) => string;
  inMemoryConnectors: InMemoryConnector[];
}

export function registerInboundRoutes({
  router,
  inboundEventsEnabled,
  maxBodyBytes,
  maxEmitted,
  logger,
  emitConnectorEvents,
  getStartServices,
  getSpaceId,
  inMemoryConnectors,
}: RegisterInboundRoutesParams): void {
  router.versioned
    .post({
      path: INBOUND_EVENTS_API_PATH,
      access: 'public',
      security: INBOUND_EVENTS_SECURITY,
      summary: 'Ingest an external event for a connector',
      description:
        'Public ingress for connector-scoped inbound events. Authenticate with an ingest token (`Authorization: Bearer`, or `token` query parameter as fallback).',
      options: {
        xsrfRequired: false,
        tags: ['api'],
        body: {
          accepts: ['application/json', 'application/*+json', '*/*'],
          maxBytes: maxBodyBytes,
        },
      },
    })
    .addVersion(
      {
        version: INBOUND_EVENTS_API_VERSION,
        validate: {
          request: {
            params: schema.object({
              // maxLength is pre-normalize; handle rejects if normalize prepends '.' past the cap.
              typeId: schema.string({
                minLength: 1,
                maxLength: MAX_CONNECTOR_TYPE_ID_LENGTH,
              }),
              connectorId: schema.string({
                minLength: 1,
                maxLength: CONNECTOR_ID_MAX_LENGTH,
              }),
            }),
            query: schema.object(
              {
                token: schema.maybe(
                  schema.string({
                    minLength: 1,
                    maxLength: INBOUND_EVENTS_TOKEN_MAX_LENGTH,
                  })
                ),
              },
              { unknowns: 'allow' }
            ),
            body: schema.maybe(schema.any()),
          },
        },
      },
      async (_context, request, response) => {
        const [coreStart] = await getStartServices();
        const spaceId = getSpaceId(request);
        const internalRequest = kibanaRequestFactory({
          headers: {},
          spaceId: asSpaceId(spaceId),
        });
        const unsecuredSavedObjectsClient = coreStart.savedObjects.getScopedClient(
          internalRequest,
          {
            excludedExtensions: [SECURITY_EXTENSION_ID],
            includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
          }
        );

        return handleInboundRequest({
          request,
          response,
          typeId: request.params.typeId,
          connectorId: request.params.connectorId,
          spaceId,
          inboundEventsEnabled,
          maxEmitted,
          emitConnectorEvents,
          logger,
          unsecuredSavedObjectsClient,
          inMemoryConnectors,
        });
      }
    );
}
