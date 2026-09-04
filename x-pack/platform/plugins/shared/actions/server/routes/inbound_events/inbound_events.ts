/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest } from '@kbn/core/server';

import type {
  IngestEventsRequestBodyV1,
  IngestEventsRequestParamsV1,
  IngestEventsRequestQueryV1,
} from '../../../common/routes/events/apis/ingest';
import {
  ingestEventsRequestBodySchemaV1,
  ingestEventsRequestParamsSchemaV1,
  ingestEventsRequestQuerySchemaV1,
} from '../../../common/routes/events/apis/ingest';
import {
  ingestEventsAckResponseSchemaV1,
  ingestEventsResponseSchemaV1,
} from '../../../common/routes/events/response';
import type { ActionsRequestHandlerContext } from '../../types';
import {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_API_VERSION,
  INBOUND_EVENTS_SECURITY,
} from '../../inbound/constants';
import type { InboundEventsClient } from '../../inbound/client';
import { mapIngestResultToResponse } from '../../inbound/map_ingest_result_to_response';

export interface InboundEventsRouteParams {
  router: IRouter<ActionsRequestHandlerContext>;
  maxBodyBytes: number;
  inboundEventsClient: InboundEventsClient;
  getSpaceId: (request: KibanaRequest) => string;
}

type InboundEventsHttpRequest = KibanaRequest<
  IngestEventsRequestParamsV1,
  IngestEventsRequestQueryV1,
  IngestEventsRequestBodyV1
>;

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
        'Public ingress for Kibana connector-scoped inbound events. Authenticate with an ingest token (`Authorization: Bearer`, or `token` query parameter as fallback). A successful emit returns 202. A connector HTTP ack returns 200 (`.inboundWebhook` handshake is `{ challenge }`) and does not emit.',
      options: {
        // External vendors cannot send Kibana session XSRF headers (`kbn-xsrf`).
        // Auth is the ingest token (Bearer, or `token` query if Authorization is
        // absent); missing or invalid tokens 404.
        xsrfRequired: false,
        tags: ['oas-tag:connectors'],
        availability: {
          since: '9.6.0',
          stability: 'experimental',
        },
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
            params: ingestEventsRequestParamsSchemaV1,
            query: ingestEventsRequestQuerySchemaV1,
            body: ingestEventsRequestBodySchemaV1,
          },
          response: {
            200: {
              description:
                'Connector HTTP 200 ack. No event is emitted. `.inboundWebhook` handshake is `{ challenge }`.',
              body: () => ingestEventsAckResponseSchemaV1,
            },
            202: {
              description:
                'The ingress request was accepted. Downstream emit failures may still be partial; see server logs.',
              body: () => ingestEventsResponseSchemaV1,
            },
            404: {
              description:
                'Connector, connector type, or ingest token was not found or failed verification.',
            },
            500: {
              description: 'The connector failed to handle or validate the event.',
            },
          },
        },
      },
      async (_context, request: InboundEventsHttpRequest, response) => {
        const { connector_type_id: connectorTypeId, connector_id: connectorId } = request.params;
        const result = await inboundEventsClient.ingest({
          connectorTypeId,
          connectorId,
          spaceId: getSpaceId(request),
          requestId: request.id,
          headers: request.headers,
          query: request.query,
          body: request.body,
        });
        return mapIngestResultToResponse(result, response);
      }
    );
}
