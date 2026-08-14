/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CONNECTOR_TYPE_ID_LENGTH } from '@kbn/connector-specs';
import type { IRouter, KibanaRequest } from '@kbn/core/server';

import { CONNECTOR_ID_MAX_LENGTH } from '../../../common';
import type { ActionsRequestHandlerContext } from '../../types';
import {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_API_VERSION,
  INBOUND_EVENTS_SECURITY,
  INBOUND_EVENTS_TOKEN_MAX_LENGTH,
} from '../../inbound/constants';
import type { InboundEventsClient } from '../../inbound/client';
import { mapIngestResultToResponse } from '../../inbound/map_ingest_result_to_response';

export interface InboundEventsRouteParams {
  router: IRouter<ActionsRequestHandlerContext>;
  maxBodyBytes: number;
  inboundEventsClient: InboundEventsClient;
  getSpaceId: (request: KibanaRequest) => string;
}

export function inboundEventsRoute({
  router,
  maxBodyBytes,
  inboundEventsClient,
  getSpaceId,
}: InboundEventsRouteParams): void {
  router.versioned
    .post({
      path: INBOUND_EVENTS_API_PATH,
      access: 'public',
      security: INBOUND_EVENTS_SECURITY,
      summary: 'Ingest an external event for a Kibana connector',
      description:
        'Public ingress for Kibana connector-scoped inbound events. Authenticate with an ingest token (`Authorization: Bearer`, or `token` query parameter as fallback).',
      options: {
        xsrfRequired: false,
        tags: ['oas-tag:connectors'],
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
              connector_type_id: schema.string({
                minLength: 1,
                maxLength: MAX_CONNECTOR_TYPE_ID_LENGTH,
              }),
              connector_id: schema.string({
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
        const { connector_type_id: connectorTypeId, connector_id: connectorId } = request.params;
        const result = await inboundEventsClient.ingest({
          request,
          connectorTypeId,
          connectorId,
          spaceId: getSpaceId(request),
        });
        return mapIngestResultToResponse(result, response);
      }
    );
}
