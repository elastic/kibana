/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREBUILT_COMPLIANCE_RULES } from '../../../common/compliance/prebuilt_rules';

describe('prebuilt compliance rules', () => {
  it('has exactly 30 prebuilt rules', () => {
    expect(PREBUILT_COMPLIANCE_RULES).toHaveLength(30);
  });

  it('has 10 macOS rules', () => {
    const macosRules = PREBUILT_COMPLIANCE_RULES.filter((r) => r.platform === 'darwin');
    expect(macosRules).toHaveLength(10);
  });

  it('has 10 Windows rules', () => {
    const windowsRules = PREBUILT_COMPLIANCE_RULES.filter((r) => r.platform === 'windows');
    expect(windowsRules).toHaveLength(10);
  });

  it('has 10 Linux rules', () => {
    const linuxRules = PREBUILT_COMPLIANCE_RULES.filter((r) => r.platform === 'linux');
    expect(linuxRules).toHaveLength(10);
  });

  it('all rules have unique rule_ids', () => {
    const ids = PREBUILT_COMPLIANCE_RULES.map((r) => r.rule_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all rules have required fields', () => {
    for (const rule of PREBUILT_COMPLIANCE_RULES) {
      expect(rule.rule_id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.query).toBeTruthy();
      expect(rule.remediation).toBeTruthy();
      expect(rule.benchmark.id).toBeTruthy();
      expect(rule.benchmark.posture_type).toBe('endpoint');
      expect(rule.rule_number).toBeTruthy();
      expect(rule.section).toBeTruthy();
      expect([1, 2]).toContain(rule.level);
      expect(['darwin', 'windows', 'linux']).toContain(rule.platform);
      expect(rule.frameworks.length).toBeGreaterThan(0);
      expect(rule.prebuilt).toBe(true);
      expect(rule.enabled).toBe(true);
      expect(rule.interval).toBe(300);
    }
  });

  it('all rules have NIST 800-53 framework mappings', () => {
    for (const rule of PREBUILT_COMPLIANCE_RULES) {
      const nistMappings = rule.frameworks.filter((f) => f.id === 'nist_800_53');
      expect(nistMappings.length).toBeGreaterThan(0);
      for (const mapping of nistMappings) {
        expect(mapping.version).toBe('r5');
        expect(mapping.control).toBeTruthy();
      }
    }
  });
});
