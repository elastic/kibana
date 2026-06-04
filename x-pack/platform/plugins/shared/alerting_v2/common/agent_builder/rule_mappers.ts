/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAttachmentData, CreateRuleData } from '@kbn/alerting-v2-schemas';

/**
 * Maps partial rule attachment data to the API request payload,
 * filling in required defaults for missing fields. Used by both the canvas
 * save/update flow and the server-side validation operation.
 */
export const buildRulePayload = (data: Partial<RuleAttachmentData>): CreateRuleData => ({
  kind: data.kind!,
  metadata: data.metadata!,
  schedule: data.schedule!,
  query: data.query!,
  state_transition: data.state_transition ?? null,
  time_field: data.time_field ?? '@timestamp',
  ...(data.recovery_strategy !== undefined ? { recovery_strategy: data.recovery_strategy } : {}),
  ...(data.no_data_strategy !== undefined ? { no_data_strategy: data.no_data_strategy } : {}),
  ...(data.grouping !== undefined ? { grouping: data.grouping } : {}),
  ...(data.artifacts !== undefined ? { artifacts: data.artifacts } : {}),
});
