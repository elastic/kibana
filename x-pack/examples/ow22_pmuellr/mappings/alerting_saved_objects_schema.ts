/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema, TypeOf } from '@kbn/config-schema';
import semver from 'semver';

import { Alert } from './alerting_saved_objects_types';

/** this mapping is for the alerting rule saved object */
export const AlertSchema = schema.maybe(
  schema.nullable(
    schema.object({
      enabled: schema.maybe(schema.nullable(schema.boolean())),
      /** the name of the rule */
      name: schema.maybe(schema.nullable(schema.string())),
      tags: schema.maybe(schema.nullable(schema.string())),
      alertTypeId: schema.maybe(schema.nullable(schema.string())),
      schedule: schema.object({
        interval: schema.maybe(schema.nullable(schema.string())),
      }),
      consumer: schema.maybe(schema.nullable(schema.string())),
      legacyId: schema.maybe(schema.nullable(schema.string())),
      actions: schema.object({
        group: schema.maybe(schema.nullable(schema.string())),
        actionRef: schema.maybe(schema.nullable(schema.string())),
        actionTypeId: schema.maybe(schema.nullable(schema.string())),
        params: schema.maybe(schema.nullable(schema.any())),
      }),
      /** alert params, not available as a structured type */
      params: schema.maybe(schema.nullable(schema.any())),
      mapped_params: schema.object({
        risk_score: schema.maybe(schema.nullable(schema.number())),
        severity: schema.maybe(schema.nullable(schema.string())),
      }),
      scheduledTaskId: schema.maybe(schema.nullable(schema.string())),
      createdBy: schema.maybe(schema.nullable(schema.string())),
      updatedBy: schema.maybe(schema.nullable(schema.string())),
      createdAt: schema.maybe(schema.nullable(schema.string())),
      updatedAt: schema.maybe(schema.nullable(schema.string())),
      apiKey: schema.maybe(schema.nullable(schema.string())),
      apiKeyOwner: schema.maybe(schema.nullable(schema.string())),
      throttle: schema.maybe(schema.nullable(schema.string())),
      notifyWhen: schema.maybe(schema.nullable(schema.string())),
      muteAll: schema.maybe(schema.nullable(schema.boolean())),
      mutedInstanceIds: schema.maybe(schema.nullable(schema.string())),
      meta: schema.object({
        versionApiKeyLastmodified: schema.maybe(schema.nullable(schema.string())),
      }),
      monitoring: schema.object({
        execution: schema.object({
          history: schema.object({
            duration: schema.maybe(schema.nullable(schema.number())),
            success: schema.maybe(schema.nullable(schema.boolean())),
            timestamp: schema.maybe(schema.nullable(schema.string())),
          }),
          calculated_metrics: schema.object({
            p50: schema.maybe(schema.nullable(schema.number())),
            p95: schema.maybe(schema.nullable(schema.number())),
            p99: schema.maybe(schema.nullable(schema.number())),
            success_ratio: schema.maybe(schema.nullable(schema.number())),
          }),
        }),
      }),
      executionStatus: schema.object({
        numberOfTriggeredActions: schema.maybe(schema.nullable(schema.number())),
        status: schema.maybe(schema.nullable(schema.string())),
        lastExecutionDate: schema.maybe(schema.nullable(schema.string())),
        lastDuration: schema.maybe(schema.nullable(schema.number())),
        error: schema.object({
          reason: schema.maybe(schema.nullable(schema.string())),
          message: schema.maybe(schema.nullable(schema.string())),
        }),
        warning: schema.object({
          reason: schema.maybe(schema.nullable(schema.string())),
          message: schema.maybe(schema.nullable(schema.string())),
        }),
      }),
      snoozeEndTime: schema.maybe(schema.nullable(schema.string())),
    })
  )
);

export function validateAlert(data: unknown): Alert {
  return AlertSchema.validate(data);
}
