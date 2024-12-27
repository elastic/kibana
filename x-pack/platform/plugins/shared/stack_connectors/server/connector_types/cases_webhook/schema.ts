/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { WebhookMethods } from '../../../common/auth/constants';
import { AuthConfiguration, SecretConfigurationSchema } from '../../../common/auth/schema';

const HeadersSchema = schema.recordOf(schema.string(), schema.string());

export const ExternalIncidentServiceConfiguration = {
  createIncidentUrl: schema.string(),
  createIncidentMethod: schema.oneOf(
    [schema.literal(WebhookMethods.POST), schema.literal(WebhookMethods.PUT)],
    {
      defaultValue: WebhookMethods.POST,
    }
  ),
  createIncidentJson: schema.string(), // stringified object
  createIncidentResponseKey: schema.string(),
  getIncidentMethod: schema.oneOf(
    [schema.literal(WebhookMethods.GET), schema.literal(WebhookMethods.POST)],
    {
      defaultValue: WebhookMethods.GET,
    }
  ),
  getIncidentUrl: schema.string(),
  getIncidentJson: schema.nullable(schema.string()),
  getIncidentResponseExternalTitleKey: schema.string(),
  viewIncidentUrl: schema.string(),
  updateIncidentUrl: schema.string(),
  updateIncidentMethod: schema.oneOf(
    [
      schema.literal(WebhookMethods.POST),
      schema.literal(WebhookMethods.PATCH),
      schema.literal(WebhookMethods.PUT),
    ],
    {
      defaultValue: WebhookMethods.PUT,
    }
  ),
  updateIncidentJson: schema.string(),
  createCommentUrl: schema.nullable(schema.string()),
  createCommentMethod: schema.nullable(
    schema.oneOf(
      [
        schema.literal(WebhookMethods.POST),
        schema.literal(WebhookMethods.PUT),
        schema.literal(WebhookMethods.PATCH),
      ],
      {
        defaultValue: WebhookMethods.PUT,
      }
    )
  ),
  createCommentJson: schema.nullable(schema.string()),
  headers: schema.nullable(HeadersSchema),
  hasAuth: AuthConfiguration.hasAuth,
  authType: AuthConfiguration.authType,
  certType: AuthConfiguration.certType,
  ca: AuthConfiguration.ca,
  verificationMode: AuthConfiguration.verificationMode,
};

export const ExternalIncidentServiceConfigurationSchema = schema.object(
  ExternalIncidentServiceConfiguration
);

export const ExecutorSubActionPushParamsSchema = schema.object({
  incident: schema.object({
    title: schema.string(),
    description: schema.nullable(schema.string()),
    id: schema.nullable(schema.string()),
    severity: schema.nullable(schema.string()),
    status: schema.nullable(schema.string()),
    externalId: schema.nullable(schema.string()),
    tags: schema.nullable(schema.arrayOf(schema.string())),
  }),
  comments: schema.nullable(
    schema.arrayOf(
      schema.object({
        comment: schema.string(),
        commentId: schema.string(),
      })
    )
  ),
});

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('pushToService'),
    subActionParams: ExecutorSubActionPushParamsSchema,
  }),
]);

export const ExternalIncidentServiceSecretConfigurationSchema = SecretConfigurationSchema;
