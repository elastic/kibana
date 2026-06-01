/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { OAuthClientLogoMediaType } from '../../../common/oauth/constants';
import {
  OAUTH_CLIENT_LOGO_MAX_DATA_LENGTH,
  OAUTH_CLIENT_LOGO_MEDIA_TYPES,
  OAUTH_CLIENT_NAME_MAX_LENGTH,
  OAUTH_CONNECTION_NAME_MAX_LENGTH,
  OAUTH_MAX_STRING_FIELD_LENGTH,
  OAUTH_MAX_URI_LENGTH,
  OAUTH_REDIRECT_URIS_MAX_SIZE,
} from '../../../common/oauth/constants';

export const clientLogoSchema = schema.object({
  media_type: schema.oneOf(
    OAUTH_CLIENT_LOGO_MEDIA_TYPES.map((type) => schema.literal(type)) as [
      Type<OAuthClientLogoMediaType>
    ]
  ),
  data: schema.string({ minLength: 1, maxLength: OAUTH_CLIENT_LOGO_MAX_DATA_LENGTH }),
});

export const clientTypeSchema = schema.oneOf([
  schema.literal('public'),
  schema.literal('confidential'),
]);

export const redirectUrisSchema = schema.arrayOf(
  schema.string({ minLength: 1, maxLength: OAUTH_MAX_URI_LENGTH }),
  {
    maxSize: OAUTH_REDIRECT_URIS_MAX_SIZE,
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
  client_name: schema.string({ minLength: 1, maxLength: OAUTH_CLIENT_NAME_MAX_LENGTH }),
  client_type: schema.maybe(clientTypeSchema),
  client_metadata: schema.maybe(clientMetadataSchema),
  client_logo: schema.maybe(clientLogoSchema),
  redirect_uris: schema.maybe(redirectUrisSchema),
});

export const updateClientBodySchema = schema.object({
  client_name: schema.maybe(
    schema.nullable(schema.string({ maxLength: OAUTH_CLIENT_NAME_MAX_LENGTH }))
  ),
  client_metadata: schema.maybe(nullableClientMetadataSchema),
  client_logo: schema.maybe(schema.nullable(clientLogoSchema)),
  redirect_uris: schema.maybe(redirectUrisSchema),
});

export const updateConnectionBodySchema = schema.object({
  name: schema.string({ minLength: 1, maxLength: OAUTH_CONNECTION_NAME_MAX_LENGTH }),
});
