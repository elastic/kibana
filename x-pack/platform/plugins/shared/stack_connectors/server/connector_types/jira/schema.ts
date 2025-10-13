/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MAX_OTHER_FIELDS_LENGTH } from '../../../common/jira/constants';
import { validateRecordMaxKeys } from '../lib/validators';
import { validateOtherFieldsKeys } from './validators';

export const ExternalIncidentServiceConfiguration = {
  apiUrl: z.string(),
  projectKey: z.string(),
};

export const ExternalIncidentServiceConfigurationSchema = z.object(
  ExternalIncidentServiceConfiguration
);

export const ExternalIncidentServiceSecretConfiguration = {
  email: z.string(),
  apiToken: z.string(),
};

export const ExternalIncidentServiceSecretConfigurationSchema = z.object(
  ExternalIncidentServiceSecretConfiguration
);

const incidentSchemaObject = {
  summary: z.string(),
  description: z.string().nullable(),
  externalId: z.string().nullable().default(null),
  issueType: z.string().nullable(),
  priority: z.string().nullable(),
  labels: z
    .array(
      z.string().refine(
        (val) => !val.match(/\s/g),
        (val) => ({ message: `The label ${val} cannot contain spaces` })
      )
    )
    .nullable(),
  parent: z.string().nullable(),
  otherFields: z
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
        maxNumberOfFields: MAX_OTHER_FIELDS_LENGTH,
        fieldName: 'otherFields',
      })
    )
    .nullable(),
};

export const incidentSchemaObjectProperties = Object.keys(incidentSchemaObject);

export const ExecutorSubActionPushParamsSchema = z.object({
  incident: z.object(incidentSchemaObject),
  comments: z
    .array(
      z.object({
        comment: z.string(),
        commentId: z.string(),
      })
    )
    .nullable()
    .default(null),
});

export const ExecutorSubActionGetIncidentParamsSchema = z.object({
  externalId: z.string(),
});

// Reserved for future implementation
export const ExecutorSubActionCommonFieldsParamsSchema = z.object({});
export const ExecutorSubActionHandshakeParamsSchema = z.object({});
export const ExecutorSubActionGetCapabilitiesParamsSchema = z.object({});
export const ExecutorSubActionGetIssueTypesParamsSchema = z.object({});
export const ExecutorSubActionGetFieldsByIssueTypeParamsSchema = z.object({
  id: z.string(),
});
export const ExecutorSubActionGetIssuesParamsSchema = z.object({ title: z.string() });
export const ExecutorSubActionGetIssueParamsSchema = z.object({ id: z.string() });

export const ExecutorParamsSchema = z.discriminatedUnion('subAction', [
  z.object({
    subAction: z.literal('getFields'),
    subActionParams: ExecutorSubActionCommonFieldsParamsSchema,
  }),
  z.object({
    subAction: z.literal('getIncident'),
    subActionParams: ExecutorSubActionGetIncidentParamsSchema,
  }),
  z.object({
    subAction: z.literal('handshake'),
    subActionParams: ExecutorSubActionHandshakeParamsSchema,
  }),
  z.object({
    subAction: z.literal('pushToService'),
    subActionParams: ExecutorSubActionPushParamsSchema,
  }),
  z.object({
    subAction: z.literal('issueTypes'),
    subActionParams: ExecutorSubActionGetIssueTypesParamsSchema,
  }),
  z.object({
    subAction: z.literal('fieldsByIssueType'),
    subActionParams: ExecutorSubActionGetFieldsByIssueTypeParamsSchema,
  }),
  z.object({
    subAction: z.literal('issues'),
    subActionParams: ExecutorSubActionGetIssuesParamsSchema,
  }),
  z.object({
    subAction: z.literal('issue'),
    subActionParams: ExecutorSubActionGetIssueParamsSchema,
  }),
]);
