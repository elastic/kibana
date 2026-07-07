/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleCreatedEventData } from '../common/telemetry';
import type { RuleFormData } from '../types';
import { SLO_BURN_RATE_RULE_TYPE_ID } from './get_rule_save_ebt_props';
import { getTemplateIdFromPathname } from './get_template_id_from_pathname';

export interface GetRuleCreatedEventDataParams {
  ruleId: string;
  /** Pass `window.location.pathname`; kept as a param so this stays a pure, testable function. */
  pathname: string;
  formData: Pick<RuleFormData, 'ruleTypeId' | 'params' | 'artifacts'>;
}

/**
 * Builds the payload for the `rule_created` EBT event (see `reportRuleCreatedEvent`), fired once
 * the create-flow's API call resolves successfully.
 */
export function getRuleCreatedEventData({
  ruleId,
  pathname,
  formData,
}: GetRuleCreatedEventDataParams): RuleCreatedEventData {
  const sloId =
    formData.ruleTypeId === SLO_BURN_RATE_RULE_TYPE_ID
      ? (formData.params as { sloId?: string } | undefined)?.sloId
      : undefined;

  const dashboardIds = formData.artifacts?.dashboards?.map(({ id }) => id);

  return {
    rule_id: ruleId,
    rule_type_id: formData.ruleTypeId!,
    template_id: getTemplateIdFromPathname(pathname),
    ...(sloId && { slo_id: sloId }),
    ...(dashboardIds && dashboardIds.length > 0 && { dashboard_ids: dashboardIds }),
  };
}
