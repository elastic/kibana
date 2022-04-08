/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** this mapping is for the alerting rule saved object */
export interface Alert {
  enabled?: boolean | null;
  name?: string | null;
  tags?: string | null;
  alertTypeId?: string | null;
  schedule?: {
    interval?: string | null;
  } | null;
  consumer?: string | null;
  legacyId?: string | null;
  actions?: Array<{
    group?: string | null;
    actionRef?: string | null;
    actionTypeId?: string | null;
    params?: Record<string, any>;
  }> | null;
  params?: object | null;
  mapped_params?: {
    risk_score?: number | null;
    severity?: string | null;
  } | null;
  scheduledTaskId?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  apiKey?: string | null;
  apiKeyOwner?: string | null;
  throttle?: string | null;
  notifyWhen?: string | null;
  muteAll?: boolean | null;
  mutedInstanceIds?: string | null;
  meta?: {
    versionApiKeyLastmodified?: string | null;
  } | null;
  monitoring?: {
    execution?: {
      history?: {
        duration?: number | null;
        success?: boolean | null;
        timestamp?: string | null;
      } | null;
      calculated_metrics?: {
        p50?: number | null;
        p95?: number | null;
        p99?: number | null;
        success_ratio?: number | null;
      } | null;
    } | null;
  } | null;
  executionStatus?: {
    numberOfTriggeredActions?: number | null;
    status?: string | null;
    lastExecutionDate?: string | null;
    lastDuration?: number | null;
    error?: {
      reason?: string | null;
      message?: string | null;
    } | null;
    warning?: {
      reason?: string | null;
      message?: string | null;
    } | null;
  } | null;
  snoozeEndTime?: string | null;
}
