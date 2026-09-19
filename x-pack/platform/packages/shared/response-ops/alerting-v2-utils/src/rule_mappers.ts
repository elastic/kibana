/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleAttachmentData, CreateRuleData } from '@kbn/alerting-v2-schemas';
import { noDataStrategy, recoveryStrategy } from '@kbn/alerting-v2-schemas';
import { DEFAULT_TIME_FIELD } from '@kbn/alerting-v2-constants';

/**
 * The lifecycle an alert rule gets when the author did not pick one. The write
 * API requires both objects and defaults neither, so the choice is made here,
 * on the authoring side. Signal rules carry neither.
 */
const buildLifecycle = (data: Partial<RuleAttachmentData>) =>
  data.kind === 'alert'
    ? {
        recovery: data.recovery ?? { strategy: recoveryStrategy.no_breach },
        no_data: data.no_data ?? { strategy: noDataStrategy.ignore },
      }
    : {};

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
  time_field: data.time_field ?? DEFAULT_TIME_FIELD,
  ...buildLifecycle(data),
  ...(data.grouping !== undefined ? { grouping: data.grouping } : {}),
  ...(data.artifacts !== undefined ? { artifacts: data.artifacts } : {}),
});
