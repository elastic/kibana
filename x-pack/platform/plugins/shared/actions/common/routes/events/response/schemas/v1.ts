/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_HANDSHAKE_CHALLENGE_LENGTH } from '@kbn/connector-specs';

export const ingestEventsResponseSchema = schema.object(
  {
    ok: schema.boolean({
      meta: {
        description: 'Indicates the ingress request was accepted for processing.',
      },
    }),
  },
  { meta: { id: 'ingest_events_response' } }
);

/**
 * Public ingest HTTP 200. v1 is a generic JSON object so a later connector can ack
 * without a new OAS version. `.inboundWebhook` handshake is `{ challenge }`.
 */
export const ingestEventsAckResponseSchema = schema.object(
  {
    challenge: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: MAX_HANDSHAKE_CHALLENGE_LENGTH,
        meta: {
          description:
            'When present, echo of a top-level request `challenge` (inbound webhook handshake). No event is emitted.',
        },
      })
    ),
  },
  {
    unknowns: 'allow',
    meta: {
      id: 'ingest_events_ack_response',
      description:
        'Connector HTTP 200 ack. `.inboundWebhook` handshake is `{ challenge }`. Other connector types may return a different JSON object.',
    },
  }
);
