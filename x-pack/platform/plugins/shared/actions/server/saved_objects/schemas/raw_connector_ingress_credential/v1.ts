/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CONNECTOR_ID_MAX_LENGTH } from '../../../../common';

const INGEST_TOKEN_HASH_HEX_LENGTH = 64;
const CREATED_AT_MAX_LENGTH = 32;

export const rawConnectorIngressCredentialSchema = schema.object({
  connectorId: schema.string({ maxLength: CONNECTOR_ID_MAX_LENGTH }),
  ingestTokenHash: schema.string({
    minLength: INGEST_TOKEN_HASH_HEX_LENGTH,
    maxLength: INGEST_TOKEN_HASH_HEX_LENGTH,
  }),
  createdAt: schema.string({ maxLength: CREATED_AT_MAX_LENGTH }),
});
