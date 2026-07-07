/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleCreatedEventData } from './get_rule_created_event_data';
import { SLO_BURN_RATE_RULE_TYPE_ID } from './get_rule_save_ebt_props';

describe('getRuleCreatedEventData', () => {
  it('returns the minimal payload when there is nothing else to report', () => {
    const data = getRuleCreatedEventData({
      ruleId: 'rule-1',
      pathname: '/app/management/insightsAndAlerting/triggersActions/rule/create/.es-query',
      formData: { ruleTypeId: '.es-query', params: {}, artifacts: undefined },
    });

    expect(data).toEqual({
      rule_id: 'rule-1',
      rule_type_id: '.es-query',
      template_id: undefined,
    });
  });

  it('includes the template_id when created from a template', () => {
    const data = getRuleCreatedEventData({
      ruleId: 'rule-1',
      pathname: '/app/management/insightsAndAlerting/triggersActions/create/template/my-template',
      formData: { ruleTypeId: '.es-query', params: {}, artifacts: undefined },
    });

    expect(data.template_id).toBe('my-template');
  });

  it('includes slo_id only for burn rate rules', () => {
    const burnRateData = getRuleCreatedEventData({
      ruleId: 'rule-1',
      pathname: '/create/slo.rules.burnRate',
      formData: {
        ruleTypeId: SLO_BURN_RATE_RULE_TYPE_ID,
        params: { sloId: 'slo-1' },
        artifacts: undefined,
      },
    });
    expect(burnRateData.slo_id).toBe('slo-1');

    const otherRuleData = getRuleCreatedEventData({
      ruleId: 'rule-1',
      pathname: '/create/.es-query',
      formData: {
        ruleTypeId: '.es-query',
        params: { sloId: 'slo-1' },
        artifacts: undefined,
      },
    });
    expect(otherRuleData.slo_id).toBeUndefined();
  });

  it('includes dashboard_ids when the rule has linked dashboards', () => {
    const data = getRuleCreatedEventData({
      ruleId: 'rule-1',
      pathname: '/create/.es-query',
      formData: {
        ruleTypeId: '.es-query',
        params: {},
        artifacts: { dashboards: [{ id: 'dash-1' }, { id: 'dash-2' }] },
      },
    });

    expect(data.dashboard_ids).toEqual(['dash-1', 'dash-2']);
  });

  it('omits dashboard_ids when there are none', () => {
    const data = getRuleCreatedEventData({
      ruleId: 'rule-1',
      pathname: '/create/.es-query',
      formData: { ruleTypeId: '.es-query', params: {}, artifacts: { dashboards: [] } },
    });

    expect(data.dashboard_ids).toBeUndefined();
  });
});
