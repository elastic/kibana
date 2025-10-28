/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { WebhookMethods } from '../../../common/auth/constants';
import { AuthConfiguration, SecretConfigurationSchema } from '../../../common/auth/schema';

const HeadersSchema = z.record(z.string(), z.string());

export const ExternalIncidentServiceConfiguration = {
  createIncidentUrl: z.string(),
  createIncidentMethod: z
    .enum([WebhookMethods.POST, WebhookMethods.PUT])
    .default(WebhookMethods.POST),
  createIncidentJson: z.string(), // stringified object
  createIncidentResponseKey: z.string(),
  getIncidentMethod: z.enum([WebhookMethods.GET, WebhookMethods.POST]).default(WebhookMethods.GET),
  getIncidentUrl: z.string(),
  getIncidentJson: z.string().nullable().default(null),
  getIncidentResponseExternalTitleKey: z.string(),
  viewIncidentUrl: z.string(),
  updateIncidentUrl: z.string(),
  updateIncidentMethod: z
    .enum([WebhookMethods.POST, WebhookMethods.PATCH, WebhookMethods.PUT])
    .default(WebhookMethods.PUT),
  updateIncidentJson: z.string(),
  createCommentUrl: z.string().nullable().default(null),
  createCommentMethod: z
    .enum([WebhookMethods.POST, WebhookMethods.PUT, WebhookMethods.PATCH])
    .default(WebhookMethods.PUT)
    .nullable(),
  createCommentJson: z.string().nullable().default(null),
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

export const ExternalIncidentServiceConfigurationSchema = z
  .object(ExternalIncidentServiceConfiguration)
  .strict();

export const ExecutorSubActionPushParamsSchema = z
  .object({
    incident: z
      .object({
        title: z.string(),
        description: z.string().nullable().default(null),
        id: z.string().nullable().default(null),
        severity: z.string().nullable().default(null),
        status: z.string().nullable().default(null),
        externalId: z.string().nullable().default(null),
        tags: z.array(z.string()).nullable().default(null),
      })
      .strict(),
    comments: z
      .array(
        z
          .object({
            comment: z.string(),
            commentId: z.string(),
          })
          .strict()
      )
      .nullable()
      .default(null),
  })
  .strict();

export const ExecutorParamsSchema = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('pushToService'),
      subActionParams: ExecutorSubActionPushParamsSchema,
    })
    .strict(),
]);

export const ExternalIncidentServiceSecretConfigurationSchema = SecretConfigurationSchema;
