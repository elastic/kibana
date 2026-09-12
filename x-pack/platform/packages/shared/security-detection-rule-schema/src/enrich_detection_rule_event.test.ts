/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionRuleCommonFields } from './detection_rule_common_fields';
import { enrichDetectionRuleEvent } from './enrich_detection_rule_event';

/** Minimal valid DetectionRuleCommonFields fixture. */
const BASE_FIELDS: DetectionRuleCommonFields = {
  severity: 'high',
  risk_score: 73,
};

const BASE_RULE = {
  id: 'rule-uuid-1',
  signature_id: 'sig-abc-123',
  kind: 'signal' as const,
};

describe('enrichDetectionRuleEvent', () => {
  it('returns the severity from the rule fields', () => {
    const result = enrichDetectionRuleEvent({
      fields: { ...BASE_FIELDS, severity: 'critical' },
      rule: BASE_RULE,
      row: {},
    });
    expect(result.severity).toBe('critical');
  });

  it('returns low severity when fields.severity is low', () => {
    const result = enrichDetectionRuleEvent({
      fields: { ...BASE_FIELDS, severity: 'low' },
      rule: BASE_RULE,
      row: {},
    });
    expect(result.severity).toBe('low');
  });

  it('puts kibana.alert.risk_score into data from fields.risk_score', () => {
    const result = enrichDetectionRuleEvent({
      fields: { ...BASE_FIELDS, risk_score: 42 },
      rule: BASE_RULE,
      row: {},
    });
    expect(result.data?.['kibana.alert.risk_score']).toBe(42);
  });

  it('puts kibana.alert.rule.rule_id into data from rule.signature_id', () => {
    const result = enrichDetectionRuleEvent({
      fields: BASE_FIELDS,
      rule: { ...BASE_RULE, signature_id: 'sig-xyz' },
      row: {},
    });
    expect(result.data?.['kibana.alert.rule.rule_id']).toBe('sig-xyz');
  });

  it('returns exactly two data keys', () => {
    const result = enrichDetectionRuleEvent({ fields: BASE_FIELDS, rule: BASE_RULE, row: {} });
    expect(Object.keys(result.data ?? {})).toEqual([
      'kibana.alert.risk_score',
      'kibana.alert.rule.rule_id',
    ]);
  });

  it('returns exactly the two top-level keys severity and data', () => {
    const result = enrichDetectionRuleEvent({ fields: BASE_FIELDS, rule: BASE_RULE, row: {} });
    expect(Object.keys(result)).toEqual(['severity', 'data']);
  });

  it('does not read from the row — a non-empty row does not change the output', () => {
    const withEmptyRow = enrichDetectionRuleEvent({ fields: BASE_FIELDS, rule: BASE_RULE, row: {} });
    const withNonEmptyRow = enrichDetectionRuleEvent({
      fields: BASE_FIELDS,
      rule: BASE_RULE,
      row: { 'kibana.alert.risk_score': 999, severity: 'info' },
    });
    expect(withNonEmptyRow).toEqual(withEmptyRow);
  });
});
