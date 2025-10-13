/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const ConfigMap = {
  id: z.string(),
  key: z.string(),
  name: z.string(),
  fieldType: z.string(),
};

export const ConfigMapSchema = z.object(ConfigMap);

export const ConfigMapping = {
  ruleNameConfig: ConfigMapSchema.nullable(),
  alertIdConfig: ConfigMapSchema.nullable(),
  caseIdConfig: ConfigMapSchema.nullable(),
  caseNameConfig: ConfigMapSchema.nullable(),
  commentsConfig: ConfigMapSchema.nullable(),
  severityConfig: ConfigMapSchema.nullable(),
  descriptionConfig: ConfigMapSchema.nullable(),
};

export const ConfigMappingSchema = z.object(ConfigMapping);

export const SwimlaneServiceConfiguration = {
  apiUrl: z.string(),
  appId: z.string(),
  connectorType: z.union([z.literal('all'), z.literal('alerts'), z.literal('cases')]),
  mappings: ConfigMappingSchema,
};

export const SwimlaneServiceConfigurationSchema = z.object(SwimlaneServiceConfiguration);

export const SwimlaneSecretsConfiguration = {
  apiToken: z.string(),
};

export const SwimlaneSecretsConfigurationSchema = z.object(SwimlaneSecretsConfiguration);

const SwimlaneFields = {
  alertId: z.string().nullable(),
  ruleName: z.string().nullable(),
  caseId: z.string().nullable(),
  caseName: z.string().nullable(),
  severity: z.string().nullable(),
  description: z.string().nullable(),
};

export const ExecutorSubActionPushParamsSchema = z.object({
  incident: z.object({
    ...SwimlaneFields,
    externalId: z.string().nullable(),
  }),
  comments: z.array(z.object({ comment: z.string(), commentId: z.string() })).nullable(),
});

export const ExecutorParamsSchema = z.discriminatedUnion('subAction', [
  z.object({
    subAction: z.literal('pushToService'),
    subActionParams: ExecutorSubActionPushParamsSchema,
  }),
]);
