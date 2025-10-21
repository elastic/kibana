/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Coerced } from '../../../../common/lib';
import { MAX_ADDITIONAL_FIELDS_LENGTH } from '../../../../common/servicenow/constants';
import { validateRecordMaxKeys } from '../validators';
import { DEFAULT_ALERTS_GROUPING_KEY } from './config';
import { validateOtherFieldsKeys } from './validators';

export const ExternalIncidentServiceConfigurationBase = {
  apiUrl: z.string(),
  isOAuth: z.boolean().default(false),
  userIdentifierValue: z.string().nullable().default(null), // required if isOAuth = true
  clientId: z.string().nullable().default(null), // required if isOAuth = true
  jwtKeyId: z.string().nullable().default(null), // required if isOAuth = true
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
  password: z.string().nullable().default(null), // required if isOAuth = false
  username: z.string().nullable().default(null), // required if isOAuth = false
  clientSecret: z.string().nullable().default(null), // required if isOAuth = true
  privateKey: z.string().nullable().default(null), // required if isOAuth = true
  privateKeyPassword: z.string().nullable().default(null),
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
  .nullable()
  .default(null);

const CommonAttributes = {
  short_description: z.string(),
  description: z.string().nullable().default(null),
  externalId: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  subcategory: z.string().nullable().default(null),
  correlation_id: z.string().nullable().default(DEFAULT_ALERTS_GROUPING_KEY),
  correlation_display: z.string().nullable().default(null),
  additional_fields: Coerced(
    z
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
      .nullable()
      .default(null)
  ),
};

export const commonIncidentSchemaObjectProperties = Object.keys(CommonAttributes);

// Schema for ServiceNow Incident Management (ITSM)
export const ExecutorSubActionPushParamsSchemaITSM = z
  .object({
    incident: z
      .object({
        ...CommonAttributes,
        severity: z.string().nullable().default(null),
        urgency: z.string().nullable().default(null),
        impact: z.string().nullable().default(null),
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
        dest_ip: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        malware_hash: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        malware_url: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        source_ip: z
          .union([
            z.string().nullable().default(null),
            z.array(z.string()).nullable().default(null),
          ])
          .default(null),
        priority: z.string().nullable().default(null),
      })
      .strict(),
    comments: CommentsSchema,
  })
  .strict();

// Schema for ServiceNow ITOM
export const ExecutorSubActionAddEventParamsSchema = z
  .object({
    source: z.string().nullable().default(null),
    event_class: z.string().nullable().default(null),
    resource: z.string().nullable().default(null),
    node: z.string().nullable().default(null),
    metric_name: z.string().nullable().default(null),
    type: z.string().nullable().default(null),
    severity: z.string().nullable().default(null),
    description: z.string().nullable().default(null),
    additional_info: z.string().nullable().default(null),
    message_key: z.string().nullable().default(DEFAULT_ALERTS_GROUPING_KEY),
    time_of_event: z.string().nullable().default(null),
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
        externalId: z.string().nullable().default(null),
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
