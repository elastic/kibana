/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AuthConfiguration } from '../../../common/auth/schema';
import { WebhookMethods } from '../../../common/auth/constants';

export const HeadersSchema = schema.recordOf(schema.string(), schema.string());

const configSchemaProps = {
  url: schema.string(),
  method: schema.oneOf([schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)], {
    defaultValue: WebhookMethods.POST,
  }),
  headers: schema.nullable(HeadersSchema),
  hasAuth: AuthConfiguration.hasAuth,
  authType: AuthConfiguration.authType,
  certType: AuthConfiguration.certType,
  ca: AuthConfiguration.ca,
  verificationMode: AuthConfiguration.verificationMode,
};

export const ConfigSchema = schema.object(configSchemaProps);

// params definition
export const ParamsSchema = schema.object({
  body: schema.maybe(schema.string()),
});
