/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const connectorSsfDiscoveryResponseSchema = schema.object(
  {
    spec_version: schema.string({ meta: { description: 'The SSF version.' } }),
    issuer: schema.string({ meta: { description: 'The issuer of the signed tokens.' } }),
    jwks_uri: schema.string({ meta: { description: 'The URL of the public keys.' } }),
    delivery_methods_supported: schema.arrayOf(schema.string(), {
      maxSize: 10,
      meta: { description: 'The supported delivery methods.' },
    }),
  },
  { meta: { id: 'connector_ssf_discovery_response' } }
);

export const connectorJwksResponseSchema = schema.object(
  {
    keys: schema.arrayOf(
      schema.object({
        kty: schema.string(),
        n: schema.string(),
        e: schema.string(),
        kid: schema.string(),
        alg: schema.string(),
        use: schema.string(),
      }),
      { maxSize: 10, meta: { description: 'The public keys of the connector, as JSON Web Keys.' } }
    ),
  },
  { meta: { id: 'connector_jwks_response' } }
);
