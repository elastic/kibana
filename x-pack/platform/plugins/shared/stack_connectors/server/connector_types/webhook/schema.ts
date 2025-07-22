/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  AuthConfiguration,
  SecretConfiguration,
  SecretConfigurationSchemaValidation,
} from '../../../common/auth/schema';
import { AuthType, WebhookMethods } from '../../../common/auth/constants';

export const HeadersSchema = schema.recordOf(schema.string(), schema.string());

const configSchemaProps = {
  url: schema.string(),
  method: schema.oneOf([schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)], {
    defaultValue: WebhookMethods.POST,
  }),
  headers: schema.nullable(HeadersSchema),
  hasAuth: AuthConfiguration.hasAuth,
  authType: schema.maybe(
    schema.oneOf(
      [
        schema.literal(AuthType.Basic),
        schema.literal(AuthType.SSL),
        schema.literal(AuthType.OAuth2ClientCredentials),
        schema.literal(null),
      ],
      {
        defaultValue: AuthType.Basic,
      }
    )
  ),
  certType: AuthConfiguration.certType,
  ca: AuthConfiguration.ca,
  verificationMode: AuthConfiguration.verificationMode,
  accessTokenUrl: schema.maybe(schema.string()),
  clientId: schema.maybe(schema.string()),
  scope: schema.maybe(schema.string()),
  additionalFields: schema.maybe(schema.string()),
};

export const ConfigSchema = schema.object(configSchemaProps);

// params definition
export const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});

export const SecretsSchema = schema.object(
  {
    ...SecretConfiguration,
    clientSecret: schema.nullable(schema.string()),
  },
  SecretConfigurationSchemaValidation
);
