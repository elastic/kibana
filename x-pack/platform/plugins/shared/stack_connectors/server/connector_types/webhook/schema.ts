/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { AuthConfiguration } from '../../../common/auth/schema';
import { WebhookMethods } from '../../../common/auth/constants';

export const HeadersSchema = z.record(z.string(), z.string());

const configSchemaProps = {
  url: z.string(),
  method: z
    .enum([
      WebhookMethods.POST,
      WebhookMethods.PUT,
      WebhookMethods.PATCH,
      WebhookMethods.GET,
      WebhookMethods.DELETE,
    ])
    .default(WebhookMethods.POST),
  headers: HeadersSchema.nullable().default(null),
  hasAuth: AuthConfiguration.hasAuth,
  authType: AuthConfiguration.authType,
  certType: AuthConfiguration.certType,
  ca: AuthConfiguration.ca,
  verificationMode: AuthConfiguration.verificationMode,
  accessTokenUrl: AuthConfiguration.accessTokenUrl,
  clientId: AuthConfiguration.clientId,
  scope: AuthConfiguration.scope,
  additionalFields: AuthConfiguration.additionalFields,
};

export const ConfigSchema = z.object(configSchemaProps).strict();

// params definition
export const ParamsSchema = z
  .object({
    body: z.string().optional(),
  })
  .strict();
