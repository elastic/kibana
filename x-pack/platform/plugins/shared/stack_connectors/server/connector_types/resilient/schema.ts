/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { validateKeysAllowed, validateRecordMaxKeys } from '../lib/validators';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: z.string(),
  orgId: z.string(),
};

export const ExternalIncidentServiceConfigurationSchema = z.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  apiKeyId: z.string(),
  apiKeySecret: z.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = z.object(
  ExternalIncidentServiceSecretConfiguration
);

const MAX_ADDITIONAL_FIELDS_LENGTH = 50;

const AdditionalFields = {
  additionalFields: z
    .record(
      z.string().superRefine((value, ctx) => {
        validateOtherFieldsKeys(value, ctx);
      }),
      z.any().superRefine((val, ctx) =>
        validateRecordMaxKeys({
          record: val,
          ctx,
          maxNumberOfFields: MAX_ADDITIONAL_FIELDS_LENGTH,
          fieldName: 'additionalFields',
        })
      )
    )
    .nullable(),
};

const CommonIncidentAttributes = {
  name: z.string(),
  description: z.string().nullable(),
  externalId: z.string().nullable(),
  incidentTypes: z.array(z.number()).nullable(),
  severityCode: z.number().nullable(),
  ...AdditionalFields,
};

export const commonIncidentSchemaObjectProperties = Object.keys(CommonIncidentAttributes);

const validateOtherFieldsKeys = (key: string, ctx: z.RefinementCtx) => {
  validateKeysAllowed({
    key,
    ctx,
    disallowList: commonIncidentSchemaObjectProperties,
    fieldName: 'additionalFields',
  });
};

export const ExecutorSubActionPushParamsSchema = z.object({
  incident: z.object({
    ...CommonIncidentAttributes,
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

export const PushToServiceIncidentSchema = {
  name: z.string(),
  description: z.string().nullable(),
  incidentTypes: z.array(z.number()).nullable(),
  severityCode: z.number().nullable(),
  ...AdditionalFields,
};

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = z.object({});
export const ExecutorSubActionGetIncidentTypesParamsSchema = z.object({});
export const ExecutorSubActionGetSeverityParamsSchema = z.object({});

const ArrayOfValuesSchema = z.array(
  z
    .object({
      value: z.number(),
      label: z.string(),
    })
    .passthrough()
);

export const GetIncidentTypesResponseSchema = z
  .object({
    values: ArrayOfValuesSchema,
  })
  .passthrough();

export const GetSeverityResponseSchema = z
  .object({
    values: ArrayOfValuesSchema,
  })
  .passthrough();

const ValuesItemSchema = z
  .object({
    value: z.union([z.number(), z.string()]),
    label: z.string(),
    enabled: z.boolean(),
    hidden: z.boolean(),
    default: z.boolean(),
  })
  .passthrough();

export const ExternalServiceFieldsSchema = z
  .object({
    input_type: z.string(),
    name: z.string(),
    read_only: z.boolean(),
    required: z.string().nullable(),
    text: z.string(),
    prefix: z.string().nullable(),
    values: z.array(ValuesItemSchema).nullable(),
  })
  .passthrough();

export type ResilientFieldMeta = z.infer<typeof ExternalServiceFieldsSchema>;

export const GetCommonFieldsResponseSchema = z.array(ExternalServiceFieldsSchema);

export const ExternalServiceIncidentResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  pushedDate: z.string(),
});

export const GetIncidentResponseSchema = z
  .object({
    id: z.number(),
    inc_last_modified_date: z.number(),
  })
  .passthrough();
