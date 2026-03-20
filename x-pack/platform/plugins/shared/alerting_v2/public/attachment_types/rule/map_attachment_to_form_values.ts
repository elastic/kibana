/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormValues } from '@kbn/alerting-v2-rule-form';
import type { RuleAttachmentData } from '../../../common/attachment_types';

export const mapAttachmentToFormValues = (data: RuleAttachmentData): Partial<FormValues> => ({
  kind: data.kind,
  metadata: {
    name: data.metadata.name,
    enabled: data.metadata.enabled,
    description: data.metadata.description,
    owner: data.metadata.owner,
    labels: data.metadata.labels,
  },
  timeField: data.timeField,
  schedule: {
    every: data.schedule.every,
    lookback: data.schedule.lookback,
  },
  evaluation: {
    query: {
      base: data.evaluation.query.base,
      condition: data.evaluation.query.condition,
    },
  },
  ...(data.grouping ? { grouping: { fields: data.grouping.fields } } : {}),
  ...(data.recoveryPolicy
    ? {
        recoveryPolicy: {
          type: data.recoveryPolicy.type,
          query: data.recoveryPolicy.query,
        },
      }
    : {}),
  ...(data.stateTransition
    ? {
        stateTransition: {
          pendingCount: data.stateTransition.pendingCount,
          pendingTimeframe: data.stateTransition.pendingTimeframe,
          recoveringCount: data.stateTransition.recoveringCount,
          recoveringTimeframe: data.stateTransition.recoveringTimeframe,
        },
      }
    : {}),
});
