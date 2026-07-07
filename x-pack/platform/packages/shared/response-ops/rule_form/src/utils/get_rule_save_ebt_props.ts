/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEbtProps } from '@kbn/ebt-click';
import type { RuleFormData } from '../types';

/**
 * `data-ebt-action` value shared by every rule save button (page footer, create flyout
 * footer, edit flyout footer). Kept consistent so the three surfaces are queryable together.
 */
export const RULE_SAVE_EBT_ACTION = 'ruleSave';

/**
 * Rule type id for the SLO burn rate rule. Hardcoded here (rather than imported from the SLO
 * plugin) because `rule_form` is a rule-type-agnostic package and must not depend on any
 * particular rule type's plugin.
 */
export const SLO_BURN_RATE_RULE_TYPE_ID = 'slo.rules.burnRate';

export interface GetRuleSaveEbtPropsParams {
  /** `data-ebt-element` value, unique per save button surface. */
  element: string;
  /** The rule's id, only known/relevant for the edit flow. */
  ruleId?: string;
  formData: Pick<RuleFormData, 'ruleTypeId' | 'params' | 'artifacts'>;
}

/**
 * Builds the `data-ebt-*` props for a rule save button, so that clicking it is captured by
 * core's generic `click` EBT tracker with useful, synchronously-available context:
 * - `ruleId`, when editing an existing rule (not available yet at click-time when creating).
 * - `sloId`, for SLO burn rate rules only (the rule type that requires it).
 * - `dashboardIds`, when the rule has been linked to one or more dashboards via artifacts.
 */
export function getRuleSaveEbtProps({ element, ruleId, formData }: GetRuleSaveEbtPropsParams) {
  const detail: Record<string, unknown> = {};

  if (ruleId) {
    detail.ruleId = ruleId;
  }

  if (formData.ruleTypeId === SLO_BURN_RATE_RULE_TYPE_ID) {
    const sloId = (formData.params as { sloId?: string } | undefined)?.sloId;
    if (typeof sloId === 'string' && sloId.length > 0) {
      detail.sloId = sloId;
    }
  }

  const dashboardIds = formData.artifacts?.dashboards?.map(({ id }) => id);
  if (dashboardIds && dashboardIds.length > 0) {
    detail.dashboardIds = dashboardIds;
  }

  return getEbtProps({
    action: RULE_SAVE_EBT_ACTION,
    element,
    ...(Object.keys(detail).length > 0 ? { detail: JSON.stringify(detail) } : {}),
  });
}
