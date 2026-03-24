/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

export const DATA_SOURCE_DESCRIPTION_TYPE = 'platform.alerting_v2.data_source_description';

const knowledgeIndicatorSchema = z.object({
  id: z.string(),
  type: z.string(),
  subtype: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  properties: z.record(z.string(), z.unknown()),
  confidence: z.number().optional(),
  evidence: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const dataSourceDescriptionDataSchema = z.object({
  index: z.string(),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  esqlQuery: z.string(),
  schema: z.unknown(),
  logPatterns: z.array(z.unknown()),
  errorSamples: z.array(z.unknown()),
  docCount: z.number().optional(),
  dataSourceType: z.enum(['index', 'data_stream', 'alias']).optional(),
  knowledgeIndicators: z
    .object({
      indicators: z.array(knowledgeIndicatorSchema),
      source: z.enum(['index', 'llm']),
    })
    .optional(),
});

export type DataSourceDescriptionData = z.infer<typeof dataSourceDescriptionDataSchema>;

export type DataSourceDescriptionAttachment = Attachment<
  typeof DATA_SOURCE_DESCRIPTION_TYPE,
  DataSourceDescriptionData
>;

export const RULE_TYPE = 'platform.alerting_v2.rule';

export const ruleAttachmentDataSchema = z.object({
  kind: z.enum(['alert', 'signal']),
  metadata: z.object({
    name: z.string(),
    enabled: z.boolean(),
    description: z.string().optional(),
    owner: z.string().optional(),
    labels: z.array(z.string()).optional(),
  }),
  timeField: z.string(),
  schedule: z.object({
    every: z.string(),
    lookback: z.string(),
  }),
  evaluation: z.object({
    query: z.object({
      base: z.string(),
      condition: z.string().optional(),
    }),
  }),
  grouping: z
    .object({
      fields: z.array(z.string()),
    })
    .optional(),
  recoveryPolicy: z
    .object({
      type: z.enum(['query', 'no_breach']),
      query: z
        .object({
          base: z.string().optional(),
          condition: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  stateTransition: z
    .object({
      pendingCount: z.number().optional(),
      pendingTimeframe: z.string().optional(),
      recoveringCount: z.number().optional(),
      recoveringTimeframe: z.string().optional(),
    })
    .optional(),
  sourceIndex: z.string().optional(),
});

export type RuleAttachmentData = z.infer<typeof ruleAttachmentDataSchema>;

export type RuleAttachment = Attachment<typeof RULE_TYPE, RuleAttachmentData>;

export const NOTIFICATION_POLICY_TYPE = 'platform.alerting_v2.notification_policy';

const notificationPolicyWorkflowSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('existing'),
    id: z.string(),
    name: z.string(),
    yaml: z.string().optional(),
  }),
  z.object({
    source: z.literal('inline'),
    name: z.string(),
    description: z.string().optional(),
    yaml: z.string(),
    connectorTypes: z.array(z.string()).optional(),
    isValid: z.boolean().optional(),
  }),
]);

export type NotificationPolicyWorkflow = z.infer<typeof notificationPolicyWorkflowSchema>;

export const notificationPolicyAttachmentDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  matcher: z.string().optional(),
  groupBy: z.array(z.string()).optional(),
  throttle: z.object({ interval: z.string() }).optional(),
  workflow: notificationPolicyWorkflowSchema,
});

export type NotificationPolicyAttachmentData = z.infer<
  typeof notificationPolicyAttachmentDataSchema
>;

export type NotificationPolicyAttachment = Attachment<
  typeof NOTIFICATION_POLICY_TYPE,
  NotificationPolicyAttachmentData
>;
