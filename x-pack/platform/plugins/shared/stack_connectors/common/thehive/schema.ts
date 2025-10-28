/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { TheHiveSeverity, TheHiveTLP, SUB_ACTION } from './constants';

export const TheHiveConfigSchema = z
  .object({
    url: z.string(),
    organisation: z.string().nullable().default(null),
  })
  .strict();

export const TheHiveSecretsSchema = z
  .object({
    apiKey: z.string(),
  })
  .strict();

export const ExecutorSubActionPushParamsSchema = z
  .object({
    incident: z
      .object({
        title: z.string(),
        description: z.string(),
        externalId: z.string().nullable().default(null),
        severity: z.coerce.number().default(TheHiveSeverity.MEDIUM).nullable().default(null),
        tlp: z.coerce.number().default(TheHiveTLP.AMBER).nullable().default(null),
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

export const PushToServiceIncidentSchema = {
  title: z.string(),
  description: z.string(),
  severity: z.coerce.number().nullable().default(null),
  tlp: z.coerce.number().nullable().default(null),
  tags: z.array(z.string()).nullable().default(null),
};

export const ExecutorSubActionGetIncidentParamsSchema = z
  .object({
    externalId: z.string(),
  })
  .strict();

export const ExecutorSubActionCreateAlertParamsSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    type: z.string(),
    source: z.string(),
    sourceRef: z.string(),
    severity: z.coerce.number().default(TheHiveSeverity.MEDIUM).nullable().default(null),
    isRuleSeverity: z.boolean().default(false).nullable(),
    tlp: z.coerce.number().default(TheHiveTLP.AMBER).nullable().default(null),
    tags: z.array(z.string()).nullable().default(null),
    body: z.string().nullable().default(null),
  })
  .strict();

export const ExecutorParamsSchema = z.union([
  z
    .object({
      subAction: z.literal(SUB_ACTION.PUSH_TO_SERVICE),
      subActionParams: ExecutorSubActionPushParamsSchema,
    })
    .strict(),
  z
    .object({
      subAction: z.literal(SUB_ACTION.CREATE_ALERT),
      subActionParams: ExecutorSubActionCreateAlertParamsSchema,
    })
    .strict(),
]);

export const TheHiveIncidentResponseSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  _createdBy: z.string(),
  _updatedBy: z.string().nullable().default(null),
  _createdAt: z.coerce.number(),
  _updatedAt: z.coerce.number().nullable().default(null),
  number: z.coerce.number(),
  title: z.string(),
  description: z.string(),
  severity: z.coerce.number(),
  severityLabel: z.string(),
  startDate: z.coerce.number(),
  endDate: z.coerce.number().nullable().default(null),
  tags: z.array(z.string()).nullable().default(null),
  flag: z.boolean(),
  tlp: z.coerce.number(),
  tlpLabel: z.string(),
  pap: z.coerce.number(),
  papLabel: z.string(),
  status: z.string(),
  stage: z.string(),
  summary: z.string().nullable().default(null),
  impactStatus: z.string().nullable().default(null),
  assignee: z.string().nullable().default(null),
  customFields: z.array(z.record(z.string(), z.any())).nullable().default(null),
  userPermissions: z.array(z.string()).nullable().default(null),
  extraData: z.object({}).passthrough(),
  newDate: z.coerce.number(),
  inProgressDate: z.coerce.number().nullable().default(null),
  closedDate: z.coerce.number().nullable().default(null),
  alertDate: z.coerce.number().nullable().default(null),
  alertNewDate: z.coerce.number().nullable().default(null),
  alertInProgressDate: z.coerce.number().nullable().default(null),
  alertImportedDate: z.coerce.number().nullable().default(null),
  timeToDetect: z.coerce.number(),
  timeToTriage: z.coerce.number().nullable().default(null),
  timeToQualify: z.coerce.number().nullable().default(null),
  timeToAcknowledge: z.coerce.number().nullable().default(null),
  timeToResolve: z.coerce.number().nullable().default(null),
  handlingDuration: z.coerce.number().nullable().default(null),
});

export const TheHiveUpdateIncidentResponseSchema = z.any();

export const TheHiveAddCommentResponseSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  createdBy: z.string(),
  createdAt: z.coerce.number(),
  updatedAt: z.coerce.number().nullable().default(null),
  updatedBy: z.string().nullable().default(null),
  message: z.string(),
  isEdited: z.boolean(),
  extraData: z.object({}).passthrough(),
});

export const TheHiveCreateAlertResponseSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  _createdBy: z.string(),
  _updatedBy: z.string().nullable().default(null),
  _createdAt: z.coerce.number(),
  _updatedAt: z.coerce.number().nullable().default(null),
  type: z.string(),
  source: z.string(),
  sourceRef: z.string(),
  externalLink: z.string().nullable().default(null),
  title: z.string(),
  description: z.string(),
  severity: z.coerce.number(),
  severityLabel: z.string(),
  date: z.coerce.number(),
  tags: z.array(z.string()).nullable().default(null),
  tlp: z.coerce.number(),
  tlpLabel: z.string(),
  pap: z.coerce.number(),
  papLabel: z.string(),
  follow: z.boolean().nullable().default(null),
  customFields: z.array(z.object({}).passthrough()).nullable().default(null),
  caseTemplate: z.string().nullable().default(null),
  observableCount: z.coerce.number(),
  caseId: z.string().nullable().default(null),
  status: z.string(),
  stage: z.string(),
  assignee: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  extraData: z.object({}).passthrough(),
  newDate: z.coerce.number(),
  inProgressDate: z.coerce.number().nullable().default(null),
  closedDate: z.coerce.number().nullable().default(null),
  importedDate: z.coerce.number().nullable().default(null),
  timeToDetect: z.coerce.number(),
  timeToTriage: z.coerce.number().nullable().default(null),
  timeToQualify: z.coerce.number().nullable().default(null),
  timeToAcknowledge: z.coerce.number().nullable().default(null),
});

export const TheHiveFailureResponseSchema = z.object({
  type: z.coerce.number(),
  message: z.string(),
});
