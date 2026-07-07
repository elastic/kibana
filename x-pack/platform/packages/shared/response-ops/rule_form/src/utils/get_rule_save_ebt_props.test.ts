/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleSaveEbtProps, SLO_BURN_RATE_RULE_TYPE_ID } from './get_rule_save_ebt_props';

describe('getRuleSaveEbtProps', () => {
  it('returns bare action/element props when there is nothing to include in the detail', () => {
    const props = getRuleSaveEbtProps({
      element: 'rulePageFooterSaveButton',
      formData: { ruleTypeId: '.es-query', params: {}, artifacts: undefined },
    });

    expect(props).toEqual({
      'data-ebt-action': 'ruleSave',
      'data-ebt-element': 'rulePageFooterSaveButton',
    });
  });

  it('includes ruleId when provided (edit flow)', () => {
    const props = getRuleSaveEbtProps({
      element: 'ruleFlyoutEditFooterSaveButton',
      ruleId: 'rule-1',
      formData: { ruleTypeId: '.es-query', params: {}, artifacts: undefined },
    });

    expect(props['data-ebt-detail']).toBeDefined();
    expect(JSON.parse(props['data-ebt-detail']!)).toEqual({ ruleId: 'rule-1' });
  });

  it('does not include ruleId when not provided (create flow)', () => {
    const props = getRuleSaveEbtProps({
      element: 'ruleFlyoutCreateFooterSaveButton',
      formData: { ruleTypeId: '.es-query', params: {}, artifacts: undefined },
    });

    expect(props['data-ebt-detail']).toBeUndefined();
  });

  it('includes sloId only for burn rate rules', () => {
    const burnRateProps = getRuleSaveEbtProps({
      element: 'rulePageFooterSaveButton',
      formData: {
        ruleTypeId: SLO_BURN_RATE_RULE_TYPE_ID,
        params: { sloId: 'slo-1' },
        artifacts: undefined,
      },
    });
    expect(JSON.parse(burnRateProps['data-ebt-detail']!)).toEqual({ sloId: 'slo-1' });

    const otherRuleProps = getRuleSaveEbtProps({
      element: 'rulePageFooterSaveButton',
      formData: {
        ruleTypeId: '.es-query',
        params: { sloId: 'slo-1' },
        artifacts: undefined,
      },
    });
    expect(otherRuleProps['data-ebt-detail']).toBeUndefined();
  });

  it('includes dashboardIds when the rule has linked dashboards', () => {
    const props = getRuleSaveEbtProps({
      element: 'rulePageFooterSaveButton',
      formData: {
        ruleTypeId: '.es-query',
        params: {},
        artifacts: { dashboards: [{ id: 'dash-1' }, { id: 'dash-2' }] },
      },
    });

    expect(JSON.parse(props['data-ebt-detail']!)).toEqual({
      dashboardIds: ['dash-1', 'dash-2'],
    });
  });

  it('omits dashboardIds when the dashboards array is empty', () => {
    const props = getRuleSaveEbtProps({
      element: 'rulePageFooterSaveButton',
      formData: {
        ruleTypeId: '.es-query',
        params: {},
        artifacts: { dashboards: [] },
      },
    });

    expect(props['data-ebt-detail']).toBeUndefined();
  });

  it('combines ruleId, sloId, and dashboardIds when all are present', () => {
    const props = getRuleSaveEbtProps({
      element: 'ruleFlyoutEditFooterSaveButton',
      ruleId: 'rule-1',
      formData: {
        ruleTypeId: SLO_BURN_RATE_RULE_TYPE_ID,
        params: { sloId: 'slo-1' },
        artifacts: { dashboards: [{ id: 'dash-1' }] },
      },
    });

    expect(JSON.parse(props['data-ebt-detail']!)).toEqual({
      ruleId: 'rule-1',
      sloId: 'slo-1',
      dashboardIds: ['dash-1'],
    });
  });
});
