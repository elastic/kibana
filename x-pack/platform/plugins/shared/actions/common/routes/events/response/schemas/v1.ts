/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_HANDLE_EVENTS_HTTP_BODY_BYTES,
  MAX_HANDSHAKE_CHALLENGE_LENGTH,
} from '@kbn/connector-specs';

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

const ingestEventsAckJsonResponseSchema = schema.object(
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
      description:
        'Connector HTTP 200 JSON ack. `.inboundWebhook` and Slack handshake is `{ challenge }`.',
    },
  }
);

const ingestEventsAckTextResponseSchema = schema.string({
  minLength: 1,
  maxLength: MAX_HANDLE_EVENTS_HTTP_BODY_BYTES,
  meta: {
    description: 'Plain-text HTTP ack body.',
  },
});

/**
 * Public ingest HTTP 200. A JSON object or a non-empty plain-text string.
 */
export const ingestEventsAckResponseSchema = schema.oneOf(
  [ingestEventsAckTextResponseSchema, ingestEventsAckJsonResponseSchema],
  {
    meta: {
      id: 'ingest_events_ack_response',
      description: 'Connector HTTP 200 ack. JSON or a plain-text body. No event is emitted.',
    },
  }
);
