/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Max base64-encoded logo data length (256KB), consistent with the UIAM API.
const CLIENT_LOGO_MAX_DATA_LENGTH = 262144;

// Upper bound on registered redirect URIs per OAuth client. UIAM does not enforce
// a server-side cap, so this guards Kibana against unbounded-array DoS inputs.
// 32 leaves ample headroom versus realistic client usage (localhost + a handful
// of environment-specific callbacks).
const REDIRECT_URIS_MAX_SIZE = 32;

// Generic cap for short, identifier/name-like string fields (client IDs, names,
// metadata keys/values, revocation reasons).
export const OAUTH_MAX_STRING_FIELD_LENGTH = 1024;

// Cap for URI-like string fields (client `resource`, redirect URIs).
export const OAUTH_MAX_URI_LENGTH = 2048;

export const clientLogoSchema = schema.object({
  media_type: schema.oneOf([
    schema.literal('image/png'),
    schema.literal('image/jpeg'),
    schema.literal('image/gif'),
  ]),
  data: schema.string({ minLength: 1, maxLength: CLIENT_LOGO_MAX_DATA_LENGTH }),
});

export const clientTypeSchema = schema.oneOf([
  schema.literal('public'),
  schema.literal('confidential'),
]);

export const redirectUrisSchema = schema.arrayOf(
  schema.string({ minLength: 1, maxLength: OAUTH_MAX_URI_LENGTH }),
  {
    maxSize: REDIRECT_URIS_MAX_SIZE,
  }
);

export const clientMetadataSchema = schema.recordOf(
  schema.string({ maxLength: OAUTH_MAX_STRING_FIELD_LENGTH }),
  schema.string({ maxLength: OAUTH_MAX_STRING_FIELD_LENGTH })
);

export const nullableClientMetadataSchema = schema.recordOf(
  schema.string({ maxLength: OAUTH_MAX_STRING_FIELD_LENGTH }),
  schema.nullable(schema.string({ maxLength: OAUTH_MAX_STRING_FIELD_LENGTH }))
);

export const createClientBodySchema = schema.object({
  resource: schema.string({ minLength: 1, maxLength: OAUTH_MAX_URI_LENGTH }),
  client_name: schema.string({ minLength: 1, maxLength: OAUTH_MAX_STRING_FIELD_LENGTH }),
  client_type: schema.maybe(clientTypeSchema),
  client_metadata: schema.maybe(clientMetadataSchema),
  client_logo: schema.maybe(clientLogoSchema),
  redirect_uris: schema.maybe(redirectUrisSchema),
});

export const updateClientBodySchema = schema.object({
  client_name: schema.maybe(
    schema.nullable(schema.string({ maxLength: OAUTH_MAX_STRING_FIELD_LENGTH }))
  ),
  client_metadata: schema.maybe(nullableClientMetadataSchema),
  client_logo: schema.maybe(schema.nullable(clientLogoSchema)),
  redirect_uris: schema.maybe(redirectUrisSchema),
});

export const updateConnectionBodySchema = schema.object({
  name: schema.string({ minLength: 1, maxLength: OAUTH_MAX_STRING_FIELD_LENGTH }),
});
