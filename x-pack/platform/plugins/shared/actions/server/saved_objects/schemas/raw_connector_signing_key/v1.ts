/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { CONNECTOR_ID_MAX_LENGTH } from '../../../../common';

export const rawConnectorSigningKeySchema = schema.object({
  connectorId: schema.string({ maxLength: CONNECTOR_ID_MAX_LENGTH }),
  spaceId: schema.string({ maxLength: 1024 }),
  issuer: schema.string({ maxLength: 2048 }),
  publicKey: schema.object({
    kty: schema.literal('RSA'),
    n: schema.string({ maxLength: 2048 }),
    e: schema.string({ maxLength: 16 }),
    kid: schema.string({ maxLength: 128 }),
    alg: schema.literal('RS256'),
    use: schema.literal('sig'),
  }),
  privateKey: schema.string({ maxLength: 16384 }),
  createdAt: schema.string({ maxLength: 32 }),
});
