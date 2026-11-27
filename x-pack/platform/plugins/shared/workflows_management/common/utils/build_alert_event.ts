/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedSummarizedAlerts } from '@kbn/alerting-plugin/server/types';
import type { AlertEvent, AlertEventRule } from '../types/alert_types';

/**
 * Builds the alert event structure used in workflow execution.
 * This function creates the standardized event format that contains
 * alerts, rule information, and context.
 */
export function buildAlertEvent(params: {
  alerts: CombinedSummarizedAlerts;
  rule: AlertEventRule;
  ruleUrl?: string;
  spaceId: string;
}): AlertEvent {
  return {
    alerts: [
      ...(params.alerts.new?.data ?? []),
      ...(params.alerts.ongoing?.data ?? []),
      ...(params.alerts.recovered?.data ?? []),
    ],
    rule: {
      id: params.rule.id,
      name: params.rule.name,
      tags: params.rule.tags,
      consumer: params.rule.consumer,
      producer: params.rule.producer,
      ruleTypeId: params.rule.ruleTypeId,
    },
    ruleUrl: params.ruleUrl,
    spaceId: params.spaceId,
  };
}
