/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MAX_ADDITIONAL_FIELDS_LENGTH } from '../../../../common/servicenow/constants';
import { validateRecordMaxKeys } from '../validators';
import { DEFAULT_ALERTS_GROUPING_KEY } from './config';
import { validateOtherFieldsKeys } from './validators';

export const ExternalIncidentServiceConfigurationBase = {
  apiUrl: z.string(),
  isOAuth: z.boolean().default(false),
  userIdentifierValue: z.string().nullable(), // required if isOAuth = true
  clientId: z.string().nullable(), // required if isOAuth = true
  jwtKeyId: z.string().nullable(), // required if isOAuth = true
};

export const ExternalIncidentServiceConfiguration = {
  ...ExternalIncidentServiceConfigurationBase,
  usesTableApi: z.boolean().default(true),
};

export const ExternalIncidentServiceConfigurationBaseSchema = z
  .object(ExternalIncidentServiceConfigurationBase)
  .strict();

export const ExternalIncidentServiceConfigurationSchema = z
  .object(ExternalIncidentServiceConfiguration)
  .strict();

export const ExternalIncidentServiceSecretConfiguration = {
  password: z.string().nullable(), // required if isOAuth = false
  username: z.string().nullable(), // required if isOAuth = false
  clientSecret: z.string().nullable(), // required if isOAuth = true
  privateKey: z.string().nullable(), // required if isOAuth = true
  privateKeyPassword: z.string().nullable(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = z
  .object(ExternalIncidentServiceSecretConfiguration)
  .strict();

const CommentsSchema = z
  .array(
    z
      .object({
        comment: z.string(),
        commentId: z.string(),
      })
      .strict()
  )
  .nullable();

const CommonAttributes = {
  short_description: z.string(),
  description: z.string().nullable(),
  externalId: z.string().nullable(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  correlation_id: z.string().nullable().default(DEFAULT_ALERTS_GROUPING_KEY),
  correlation_display: z.string().nullable(),
  additional_fields: z
    .record(
      z.string().superRefine((value, ctx) => {
        validateOtherFieldsKeys(value, ctx);
      }),
      z.any()
    )
    .superRefine((val, ctx) =>
      validateRecordMaxKeys({
        record: val,
        ctx,
        maxNumberOfFields: MAX_ADDITIONAL_FIELDS_LENGTH,
        fieldName: 'additional_fields',
      })
    )
    .nullable(),
};

export const commonIncidentSchemaObjectProperties = Object.keys(CommonAttributes);

// Schema for ServiceNow Incident Management (ITSM)
export const ExecutorSubActionPushParamsSchemaITSM = z
  .object({
    incident: z
      .object({
        ...CommonAttributes,
        severity: z.string().nullable(),
        urgency: z.string().nullable(),
        impact: z.string().nullable(),
      })
      .strict(),
    comments: CommentsSchema,
  })
  .strict();

// Schema for ServiceNow Security Incident Response (SIR)
export const ExecutorSubActionPushParamsSchemaSIR = z
  .object({
    incident: z
      .object({
        ...CommonAttributes,
        dest_ip: z.union([z.string().nullable(), z.array(z.string()).nullable()]).default(null),
        malware_hash: z
          .union([z.string().nullable(), z.array(z.string()).nullable()])
          .default(null),
        malware_url: z.union([z.string().nullable(), z.array(z.string()).nullable()]).default(null),
        source_ip: z.union([z.string().nullable(), z.array(z.string()).nullable()]).default(null),
        priority: z.string().nullable(),
      })
      .strict(),
    comments: CommentsSchema,
  })
  .strict();

// Schema for ServiceNow ITOM
export const ExecutorSubActionAddEventParamsSchema = z
  .object({
    source: z.string().nullable(),
    event_class: z.string().nullable(),
    resource: z.string().nullable(),
    node: z.string().nullable(),
    metric_name: z.string().nullable(),
    type: z.string().nullable(),
    severity: z.string().nullable(),
    description: z.string().nullable(),
    additional_info: z.string().nullable(),
    message_key: z.string().nullable().default(DEFAULT_ALERTS_GROUPING_KEY),
    time_of_event: z.string().nullable(),
  })
  .strict();

export const ExecutorSubActionGetIncidentParamsSchema = z
  .object({
    externalId: z.string(),
  })
  .strict();

export const ExecutorSubActionCloseIncidentParamsSchema = z
  .object({
    incident: z
      .object({
        externalId: z.string().nullable(),
        correlation_id: z.string().default(DEFAULT_ALERTS_GROUPING_KEY).nullable(),
      })
      .strict(),
  })
  .strict();

// Reserved for future implementation
export const ExecutorSubActionHandshakeParamsSchema = z.object({}).strict();
export const ExecutorSubActionCommonFieldsParamsSchema = z.object({}).strict();
export const ExecutorSubActionGetChoicesParamsSchema = z
  .object({
    fields: z.array(z.string()),
  })
  .strict();

// Executor parameters for ServiceNow Incident Management (ITSM)
export const ExecutorParamsSchemaITSM = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('getFields'),
      subActionParams: ExecutorSubActionCommonFieldsParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getIncident'),
      subActionParams: ExecutorSubActionGetIncidentParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('handshake'),
      subActionParams: ExecutorSubActionHandshakeParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('pushToService'),
      subActionParams: ExecutorSubActionPushParamsSchemaITSM,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getChoices'),
      subActionParams: ExecutorSubActionGetChoicesParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('closeIncident'),
      subActionParams: ExecutorSubActionCloseIncidentParamsSchema,
    })
    .strict(),
]);

// Executor parameters for ServiceNow Security Incident Response (SIR)
export const ExecutorParamsSchemaSIR = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('getFields'),
      subActionParams: ExecutorSubActionCommonFieldsParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getIncident'),
      subActionParams: ExecutorSubActionGetIncidentParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('handshake'),
      subActionParams: ExecutorSubActionHandshakeParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('pushToService'),
      subActionParams: ExecutorSubActionPushParamsSchemaSIR,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getChoices'),
      subActionParams: ExecutorSubActionGetChoicesParamsSchema,
    })
    .strict(),
]);

// Executor parameters for ITOM
export const ExecutorParamsSchemaITOM = z.discriminatedUnion('subAction', [
  z
    .object({
      subAction: z.literal('addEvent'),
      subActionParams: ExecutorSubActionAddEventParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal('getChoices'),
      subActionParams: ExecutorSubActionGetChoicesParamsSchema,
    })
    .strict(),
]);
