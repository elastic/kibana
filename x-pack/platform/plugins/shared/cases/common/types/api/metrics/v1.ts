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
  CONNECTORS = 'connectors',
  LIFESPAN = 'lifespan',
  MTTR = 'mttr',
  STATUS = 'status',
}

export const SingleCaseMetricsFeatureFieldSchema = z.union([
  z.literal(CaseMetricsFeature.ALERTS_COUNT),
  z.literal(CaseMetricsFeature.ALERTS_USERS),
  z.literal(CaseMetricsFeature.ALERTS_HOSTS),
  z.literal(CaseMetricsFeature.CONNECTORS),
  z.literal(CaseMetricsFeature.LIFESPAN),
]);

export const CasesMetricsFeatureFieldSchema = z.union([
  SingleCaseMetricsFeatureFieldSchema,
  z.literal(CaseMetricsFeature.MTTR),
  z.literal(CaseMetricsFeature.STATUS),
]);

const StatusInfoSchema = z.object({
  /**
   * Duration the case was in the open status in milliseconds
   */
  openDuration: z.number(),
  /**
   * Duration the case was in the in-progress status in milliseconds. Zero indicates the case was never in-progress.
   */
  inProgressDuration: z.number(),
  /**
   * The ISO string representation of the dates the case was reopened
   */
  reopenDates: z.array(z.string().max(50)),
});

const AlertHostsMetricsSchema = z.object({
  /**
   * Total unique hosts represented in the alerts
   */
  total: z.number(),
  values: z.array(
    z.object({
      /**
       * Host name
       */
      name: z.string().max(255).optional(),
      /**
       * Unique identifier for the host
       */
      id: z.string().max(512),
      /**
       * Number of alerts that have this particular host name
       */
      count: z.number(),
    })
  ),
});

const AlertUsersMetricsSchema = z.object({
  /**
   * Total unique users represented in the alerts
   */
  total: z.number(),
  values: z.array(
    z.object({
      /**
       * Username
       */
      name: z.string(),
      /**
       * Number of alerts that have this particular username
       */
      count: z.number(),
    })
  ),
});

export const SingleCaseMetricsRequestSchema = z.object({
  /**
   * The metrics to retrieve.
   */
  features: z.array(SingleCaseMetricsFeatureFieldSchema),
});

export const CasesMetricsRequestSchema = z.object({
  /**
   * The metrics to retrieve.
   */
  features: z.array(CasesMetricsFeatureFieldSchema),
  /**
   * A KQL date. If used all cases created after (gte) the from date will be returned
   */
  from: z.string().optional(),
  /**
   * A KQL date. If used all cases created before (lte) the to date will be returned.
   */
  to: z.string().optional(),
  /**
   * The owner(s) to filter by. The user making the request must have privileges to retrieve cases of that
   * ownership or they will be ignored. If no owner is included, then all ownership types will be included in the response
   * that the user has access to.
   */
  owner: z.union([z.array(z.string()), z.string()]).optional(),
});

export const SingleCaseMetricsResponseSchema = z.object({
  alerts: z
    .object({
      /**
       * Number of alerts attached to the case
       */
      count: z.number().optional(),
      /**
       * Host information represented from the alerts attached to this case
       */
      hosts: AlertHostsMetricsSchema.optional(),
      /**
       * User information represented from the alerts attached to this case
       */
      users: AlertUsersMetricsSchema.optional(),
    })
    .optional(),
  /**
   * External connectors associated with the case
   */
  connectors: z
    .object({
      /**
       * Total number of connectors in the case
       */
      total: z.number(),
    })
    .optional(),
  /**
   * The case's open,close,in-progress details
   */
  lifespan: z
    .object({
      /**
       * Date the case was created, in ISO format
       */
      creationDate: z.string(),
      /**
       * Date the case was closed, in ISO format. Will be null if the case is not currently closed
       */
      closeDate: z.string().nullable(),
      /**
       * The case's status information regarding durations in a specific status
       */
      statusInfo: StatusInfoSchema,
    })
    .optional(),
});

export const CasesMetricsResponseSchema = z.object({
  /**
   * The average resolve time of all cases in seconds
   */
  mttr: z.number().nullable().optional(),
  /**
   * The number of total cases per status
   */
  status: z.object({ open: z.number(), inProgress: z.number(), closed: z.number() }).optional(),
});

export type SingleCaseMetricsRequest = z.infer<typeof SingleCaseMetricsRequestSchema>;
export type CasesMetricsRequest = z.infer<typeof CasesMetricsRequestSchema>;
export type SingleCaseMetricsResponse = z.infer<typeof SingleCaseMetricsResponseSchema>;
export type CasesMetricsResponse = z.infer<typeof CasesMetricsResponseSchema>;
export type AlertHostsMetrics = z.infer<typeof AlertHostsMetricsSchema>;
export type AlertUsersMetrics = z.infer<typeof AlertUsersMetricsSchema>;
export type StatusInfo = z.infer<typeof StatusInfoSchema>;
export type SingleCaseMetricsFeatureField = z.infer<typeof SingleCaseMetricsFeatureFieldSchema>;
export type CasesMetricsFeatureField = z.infer<typeof CasesMetricsFeatureFieldSchema>;
