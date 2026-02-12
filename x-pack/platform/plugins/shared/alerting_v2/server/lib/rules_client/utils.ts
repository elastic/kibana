/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, UpdateRuleData, RuleResponse } from '@kbn/alerting-v2-schemas';

import { type RuleSavedObjectAttributes } from '../../saved_objects';

/**
 * Handles nullable fields from the update schema:
 * - `null` → `undefined` (client explicitly wants to clear the field)
 * - `undefined` → keeps the existing value
 * - anything else → uses the new value
 */
function nullToUndefined<T>(value: T | null | undefined, existing: T | undefined): T | undefined {
  if (value === null) return undefined;
  if (value === undefined) return existing;
  return value;
}

/**
 * Converts a create-rule API body into saved object attributes.
 *
 * Today this is a 1:1 mapping, but it gives us a seam to evolve storage
 * independently of the public API.
 */
export function transformCreateRuleBodyToRuleSoAttributes(
  data: CreateRuleData,
  serverFields: {
    enabled: boolean;
    createdBy: string | null;
    createdAt: string;
    updatedBy: string | null;
    updatedAt: string;
  }
): RuleSavedObjectAttributes {
  return {
    kind: data.kind,
    metadata: {
      name: data.metadata.name,
      owner: data.metadata.owner,
      labels: data.metadata.labels,
    },
    time_field: data.time_field,
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
    recovery_policy: data.recovery_policy,
    state_transition: data.state_transition,
    grouping: data.grouping,
    no_data: data.no_data,
    notification_policies: data.notification_policies,
    ...serverFields,
  };
}

/**
 * Builds the next saved object attributes for a rule update by deep-merging
 * the update payload into the existing attributes.
 *
 * `null` in the update payload means "clear this optional field"; the value is
 * converted to `undefined` so the SO schema (which uses `maybe()`) accepts it.
 */
export function buildUpdateRuleAttributes(
  existingAttrs: RuleSavedObjectAttributes,
  updateData: UpdateRuleData,
  serverFields: { updatedBy: string | null; updatedAt: string }
): RuleSavedObjectAttributes {
  return {
    ...existingAttrs,
    // `kind` is not updatable — always preserve the existing value.
    kind: existingAttrs.kind,
    metadata: { ...existingAttrs.metadata, ...updateData.metadata },
    time_field: updateData.time_field ?? existingAttrs.time_field,
    schedule: { ...existingAttrs.schedule, ...updateData.schedule },
    evaluation: updateData.evaluation
      ? {
          query: {
            ...existingAttrs.evaluation.query,
            ...updateData.evaluation.query,
          },
        }
      : existingAttrs.evaluation,
    // Optional top-level fields: `null` → `undefined` (clear), `undefined` → keep existing.
    recovery_policy: nullToUndefined(updateData.recovery_policy, existingAttrs.recovery_policy),
    state_transition: nullToUndefined(updateData.state_transition, existingAttrs.state_transition),
    grouping: nullToUndefined(updateData.grouping, existingAttrs.grouping),
    no_data: nullToUndefined(updateData.no_data, existingAttrs.no_data),
    notification_policies: nullToUndefined(
      updateData.notification_policies,
      existingAttrs.notification_policies
    ),
    // Server-managed fields — preserved as-is except timestamps and user.
    enabled: existingAttrs.enabled,
    createdBy: existingAttrs.createdBy,
    createdAt: existingAttrs.createdAt,
    ...serverFields,
  };
}

/**
 * Converts saved object attributes into the public API response shape.
 */
export function transformRuleSoAttributesToRuleApiResponse(
  id: string,
  attrs: RuleSavedObjectAttributes
): RuleResponse {
  return {
    id,
    kind: attrs.kind,
    metadata: {
      name: attrs.metadata.name,
      owner: attrs.metadata.owner,
      labels: attrs.metadata.labels,
    },
    time_field: attrs.time_field,
    schedule: {
      every: attrs.schedule.every,
      lookback: attrs.schedule.lookback,
    },
    evaluation: {
      query: {
        base: attrs.evaluation.query.base,
        condition: attrs.evaluation.query.condition,
      },
    },
    recovery_policy: attrs.recovery_policy,
    state_transition: attrs.state_transition,
    grouping: attrs.grouping,
    no_data: attrs.no_data,
    notification_policies: attrs.notification_policies,
    enabled: attrs.enabled,
    createdBy: attrs.createdBy,
    createdAt: attrs.createdAt,
    updatedBy: attrs.updatedBy,
    updatedAt: attrs.updatedAt,
  };
}
