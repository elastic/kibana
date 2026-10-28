/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_CONNECTOR_TYPE_ID_LENGTH } from '@kbn/connector-specs';

import { CONNECTOR_ID_MAX_LENGTH } from '../../../../..';
import { INBOUND_EVENTS_TOKEN_MAX_LENGTH } from '../../../../../inbound_events';

export { INBOUND_EVENTS_TOKEN_MAX_LENGTH };

export const ingestEventsRequestParamsSchema = schema.object({
  // maxLength is pre-normalize; hub rejects if normalize prepends '.' past the cap.
  connector_type_id: schema.string({
    minLength: 1,
    maxLength: MAX_CONNECTOR_TYPE_ID_LENGTH,
    meta: {
      description: 'The Kibana connector type identifier.',
    },
  }),
  connector_id: schema.string({
    minLength: 1,
    maxLength: CONNECTOR_ID_MAX_LENGTH,
    meta: {
      description: 'The identifier of the Kibana connector instance that should receive the event.',
    },
  }),
});

export const ingestEventsRequestQuerySchema = schema.object(
  {
    token: schema.maybe(
      schema.string({
        minLength: 1,
        maxLength: INBOUND_EVENTS_TOKEN_MAX_LENGTH,
        meta: {
          description:
            'Connector ingest token. Prefer `Authorization: Bearer <token>`. Query `token` is only used when the Authorization header is absent.',
        },
      })
    ),
  },
  { unknowns: 'allow' }
);

/**
 * Opaque JSON body for the connector `handleEvents` implementation.
 * Shape is connector-type specific; not validated by the hub.
 */
export const ingestEventsRequestBodySchema = schema.maybe(
  schema.any({
    meta: {
      description:
        'Connector-specific event payload (JSON). Validated and interpreted by the connector type’s `events.handleEvents` handler.',
    },
  })
);
