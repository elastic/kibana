/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  ingestEventsRequestParamsSchema,
  ingestEventsRequestQuerySchema,
  ingestEventsRequestBodySchema,
  INBOUND_EVENTS_TOKEN_MAX_LENGTH,
} from './schemas/latest';
export type {
  IngestEventsRequestParams,
  IngestEventsRequestQuery,
  IngestEventsRequestBody,
} from './types/latest';

export {
  ingestEventsRequestParamsSchema as ingestEventsRequestParamsSchemaV1,
  ingestEventsRequestQuerySchema as ingestEventsRequestQuerySchemaV1,
  ingestEventsRequestBodySchema as ingestEventsRequestBodySchemaV1,
} from './schemas/v1';
export type {
  IngestEventsRequestParams as IngestEventsRequestParamsV1,
  IngestEventsRequestQuery as IngestEventsRequestQueryV1,
  IngestEventsRequestBody as IngestEventsRequestBodyV1,
} from './types/v1';
