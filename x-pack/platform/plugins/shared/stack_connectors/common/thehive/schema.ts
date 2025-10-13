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
    organisation: z.string().nullable(),
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
        externalId: z.string().nullable(),
        severity: z.number().default(TheHiveSeverity.MEDIUM).nullable(),
        tlp: z.number().default(TheHiveTLP.AMBER).nullable(),
        tags: z.array(z.string()).nullable(),
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
      .nullable(),
  })
  .strict();

export const PushToServiceIncidentSchema = {
  title: z.string(),
  description: z.string(),
  severity: z.number().nullable(),
  tlp: z.number().nullable(),
  tags: z.array(z.string()).nullable(),
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
    severity: z.number().default(TheHiveSeverity.MEDIUM).nullable(),
    isRuleSeverity: z.boolean().default(false).nullable(),
    tlp: z.number().default(TheHiveTLP.AMBER).nullable(),
    tags: z.array(z.string()).nullable(),
    body: z.string().nullable(),
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
  _updatedBy: z.string().nullable(),
  _createdAt: z.number(),
  _updatedAt: z.number().nullable(),
  number: z.number(),
  title: z.string(),
  description: z.string(),
  severity: z.number(),
  severityLabel: z.string(),
  startDate: z.number(),
  endDate: z.number().nullable(),
  tags: z.array(z.string()).nullable(),
  flag: z.boolean(),
  tlp: z.number(),
  tlpLabel: z.string(),
  pap: z.number(),
  papLabel: z.string(),
  status: z.string(),
  stage: z.string(),
  summary: z.string().nullable(),
  impactStatus: z.string().nullable(),
  assignee: z.string().nullable(),
  customFields: z.array(z.record(z.string(), z.any())).nullable(),
  userPermissions: z.array(z.string()).nullable(),
  extraData: z.object({}).passthrough(),
  newDate: z.number(),
  inProgressDate: z.number().nullable(),
  closedDate: z.number().nullable(),
  alertDate: z.number().nullable(),
  alertNewDate: z.number().nullable(),
  alertInProgressDate: z.number().nullable(),
  alertImportedDate: z.number().nullable(),
  timeToDetect: z.number(),
  timeToTriage: z.number().nullable(),
  timeToQualify: z.number().nullable(),
  timeToAcknowledge: z.number().nullable(),
  timeToResolve: z.number().nullable(),
  handlingDuration: z.number().nullable(),
});

export const TheHiveUpdateIncidentResponseSchema = z.any();

export const TheHiveAddCommentResponseSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
  updatedBy: z.string().nullable(),
  message: z.string(),
  isEdited: z.boolean(),
  extraData: z.object({}).passthrough(),
});

export const TheHiveCreateAlertResponseSchema = z.object({
  _id: z.string(),
  _type: z.string(),
  _createdBy: z.string(),
  _updatedBy: z.string().nullable(),
  _createdAt: z.number(),
  _updatedAt: z.number().nullable(),
  type: z.string(),
  source: z.string(),
  sourceRef: z.string(),
  externalLink: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  severity: z.number(),
  severityLabel: z.string(),
  date: z.number(),
  tags: z.array(z.string()).nullable(),
  tlp: z.number(),
  tlpLabel: z.string(),
  pap: z.number(),
  papLabel: z.string(),
  follow: z.boolean().nullable(),
  customFields: z.array(z.object({}).passthrough()).nullable(),
  caseTemplate: z.string().nullable(),
  observableCount: z.number(),
  caseId: z.string().nullable(),
  status: z.string(),
  stage: z.string(),
  assignee: z.string().nullable(),
  summary: z.string().nullable(),
  extraData: z.object({}).passthrough(),
  newDate: z.number(),
  inProgressDate: z.number().nullable(),
  closedDate: z.number().nullable(),
  importedDate: z.number().nullable(),
  timeToDetect: z.number(),
  timeToTriage: z.number().nullable(),
  timeToQualify: z.number().nullable(),
  timeToAcknowledge: z.number().nullable(),
});

export const TheHiveFailureResponseSchema = z.object({
  type: z.number(),
  message: z.string(),
});
