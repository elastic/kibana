/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// Max base64-encoded logo data length (256KB), consistent with the UIAM API.
const CLIENT_LOGO_MAX_DATA_LENGTH = 262144;

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

export const redirectUrisSchema = schema.arrayOf(schema.string({ minLength: 1 }));

export const createClientBodySchema = schema.object({
  resource: schema.string(),
  client_name: schema.maybe(schema.string()),
  client_type: schema.maybe(clientTypeSchema),
  client_metadata: schema.maybe(schema.recordOf(schema.string(), schema.string())),
  client_logo: schema.maybe(clientLogoSchema),
  redirect_uris: schema.maybe(redirectUrisSchema),
});

export const updateClientBodySchema = schema.object({
  client_name: schema.maybe(schema.nullable(schema.string())),
  client_metadata: schema.maybe(schema.recordOf(schema.string(), schema.nullable(schema.string()))),
  client_logo: schema.maybe(schema.nullable(clientLogoSchema)),
  redirect_uris: schema.maybe(redirectUrisSchema),
});

export const updateConnectionBodySchema = schema.object({
  name: schema.string({ minLength: 1 }),
});
