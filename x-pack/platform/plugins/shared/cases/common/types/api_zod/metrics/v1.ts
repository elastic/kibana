/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export enum CaseMetricsFeature {
  ALERTS_COUNT = 'alerts.count',
  ALERTS_USERS = 'alerts.users',
  ALERTS_HOSTS = 'alerts.hosts',
  ACTIONS_ISOLATE_HOST = 'actions.isolateHost',
  CONNECTORS = 'connectors',
  LIFESPAN = 'lifespan',
  MTTR = 'mttr',
  STATUS = 'status',
}

export const SingleCaseMetricsFeatureFieldSchema = z.union([
  z.literal(CaseMetricsFeature.ALERTS_COUNT),
  z.literal(CaseMetricsFeature.ALERTS_USERS),
  z.literal(CaseMetricsFeature.ALERTS_HOSTS),
  z.literal(CaseMetricsFeature.ACTIONS_ISOLATE_HOST),
  z.literal(CaseMetricsFeature.CONNECTORS),
  z.literal(CaseMetricsFeature.LIFESPAN),
]);

export const CasesMetricsFeatureFieldSchema = z.union([
  SingleCaseMetricsFeatureFieldSchema,
  z.literal(CaseMetricsFeature.MTTR),
  z.literal(CaseMetricsFeature.STATUS),
]);

const StatusInfoSchema = z.object({
  openDuration: z.number(),
  inProgressDuration: z.number(),
  reopenDates: z.array(z.string()),
});

const AlertHostsMetricsSchema = z.object({
  total: z.number(),
  values: z.array(
    z.object({
      name: z.string().optional(),
      id: z.string(),
      count: z.number(),
    })
  ),
});

const AlertUsersMetricsSchema = z.object({
  total: z.number(),
  values: z.array(
    z.object({
      name: z.string(),
      count: z.number(),
    })
  ),
});

export const SingleCaseMetricsRequestSchema = z.object({
  features: z.array(SingleCaseMetricsFeatureFieldSchema),
});

export const CasesMetricsRequestSchema = z.object({
  features: z.array(CasesMetricsFeatureFieldSchema),
  from: z.string().optional(),
  to: z.string().optional(),
  owner: z.union([z.array(z.string()), z.string()]).optional(),
});

export const SingleCaseMetricsResponseSchema = z.object({
  alerts: z
    .object({
      count: z.number().optional(),
      hosts: AlertHostsMetricsSchema.optional(),
      users: AlertUsersMetricsSchema.optional(),
    })
    .optional(),
  connectors: z.object({ total: z.number() }).optional(),
  actions: z
    .object({
      isolateHost: z
        .object({
          isolate: z.object({ total: z.number() }),
          unisolate: z.object({ total: z.number() }),
        })
        .optional(),
    })
    .optional(),
  lifespan: z
    .object({
      creationDate: z.string(),
      closeDate: z.string().nullable(),
      statusInfo: StatusInfoSchema,
    })
    .optional(),
});

export const CasesMetricsResponseSchema = z.object({
  mttr: z.number().nullable().optional(),
  status: z.object({ open: z.number(), inProgress: z.number(), closed: z.number() }).optional(),
});

export type SingleCaseMetricsRequest = z.infer<typeof SingleCaseMetricsRequestSchema>;
export type CasesMetricsRequest = z.infer<typeof CasesMetricsRequestSchema>;
export type SingleCaseMetricsResponse = z.infer<typeof SingleCaseMetricsResponseSchema>;
export type CasesMetricsResponse = z.infer<typeof CasesMetricsResponseSchema>;
