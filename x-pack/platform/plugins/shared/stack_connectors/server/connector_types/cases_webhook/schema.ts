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
    .union([z.literal(WebhookMethods.POST), z.literal(WebhookMethods.PUT)])
    .default(WebhookMethods.POST),
  createIncidentJson: z.string(), // stringified object
  createIncidentResponseKey: z.string(),
  getIncidentMethod: z
    .union([z.literal(WebhookMethods.GET), z.literal(WebhookMethods.POST)])
    .default(WebhookMethods.GET),
  getIncidentUrl: z.string(),
  getIncidentJson: z.string().nullable(),
  getIncidentResponseExternalTitleKey: z.string(),
  viewIncidentUrl: z.string(),
  updateIncidentUrl: z.string(),
  updateIncidentMethod: z
    .union([
      z.literal(WebhookMethods.POST),
      z.literal(WebhookMethods.PATCH),
      z.literal(WebhookMethods.PUT),
    ])
    .default(WebhookMethods.PUT),
  updateIncidentJson: z.string(),
  createCommentUrl: z.string().nullable(),
  createCommentMethod: z
    .union([
      z.literal(WebhookMethods.POST),
      z.literal(WebhookMethods.PUT),
      z.literal(WebhookMethods.PATCH),
    ])
    .default(WebhookMethods.PUT)
    .nullable(),
  createCommentJson: z.string().nullable(),
  headers: HeadersSchema.nullable(),
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

export const ExternalIncidentServiceConfigurationSchema = z.object(
  ExternalIncidentServiceConfiguration
);

export const ExecutorSubActionPushParamsSchema = z.object({
  incident: z.object({
    title: z.string(),
    description: z.string().nullable(),
    id: z.string().nullable(),
    severity: z.string().nullable(),
    status: z.string().nullable(),
    externalId: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
  }),
  comments: z
    .array(
      z.object({
        comment: z.string(),
        commentId: z.string(),
      })
    )
    .nullable(),
});

export const ExecutorParamsSchema = z.discriminatedUnion('subAction', [
  z.object({
    subAction: z.literal('pushToService'),
    subActionParams: ExecutorSubActionPushParamsSchema,
  }),
]);

export const ExternalIncidentServiceSecretConfigurationSchema = SecretConfigurationSchema;
