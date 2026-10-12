/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CONNECTOR_ID_MAX_LENGTH, INBOUND_EVENTS_TOKEN_MAX_LENGTH } from '../../../../..';

export const rotateInboundIngressParamsSchema = schema.object({
  id: schema.string({
    maxLength: CONNECTOR_ID_MAX_LENGTH,
    meta: {
      description: 'An identifier for the connector.',
    },
  }),
});

export const rotateInboundIngressResponseSchema = schema.object(
  {
    ingest_token: schema.string({
      maxLength: INBOUND_EVENTS_TOKEN_MAX_LENGTH,
      meta: {
        description:
          'One-time ingest token for inbound connector events. Returned once after rotate. Store it; it cannot be retrieved again. Authenticate hub requests with `Authorization: Bearer` or the `token` query parameter.',
      },
    }),
  },
  { meta: { id: 'rotate_inbound_ingress_response' } }
);
