/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateDetectionRuleTemplate } from '../services/detection_rule_bridge';
import type { ComplianceRuleMetadata } from '../../../common/compliance';

const createMockRule = (overrides: Partial<ComplianceRuleMetadata> = {}): ComplianceRuleMetadata => ({
  rule_id: 'cis_macos_15_2_1_1',
  name: 'Ensure FileVault Is Enabled',
  description: 'Ensure FileVault Is Enabled',
  query: 'SELECT 1 FROM disk_encryption WHERE encrypted = 1;',
  remediation: 'Enable FileVault.',
  benchmark: { id: 'cis_macos_15', name: 'CIS macOS 15', version: 'v1.0.0', posture_type: 'endpoint' },
  rule_number: '2.1.1',
  section: '2 Storage',
  level: 1,
  platform: 'darwin',
  frameworks: [{ id: 'nist_800_53', version: 'r5', control: 'SC-28' }],
  tags: ['cis_macos_15', 'darwin'],
  enabled: true,
  interval: 300,
  prebuilt: true,
  resource_type: 'encryption',
  ...overrides,
});

describe('generateDetectionRuleTemplate', () => {
  it('generates a threshold detection rule with correct properties', () => {
    const rule = createMockRule();
    const template = generateDetectionRuleTemplate(rule);

    expect(template.name).toBe('Compliance: Ensure FileVault Is Enabled');
    expect(template.type).toBe('threshold');
    expect(template.severity).toBe('medium');
    expect(template.risk_score).toBe(47);
    expect(template.threshold).toEqual({ field: ['host.id'], value: 1 });
    expect(template.query).toContain('result.evaluation: "failed"');
    expect(template.query).toContain('rule.id: "cis_macos_15_2_1_1"');
    expect(template.tags).toContain('Compliance');
    expect(template.tags).toContain('compliance-rule:cis_macos_15_2_1_1');
  });

  it('uses high severity for level 2 rules', () => {
    const rule = createMockRule({ level: 2 });
    const template = generateDetectionRuleTemplate(rule);

    expect(template.severity).toBe('high');
    expect(template.risk_score).toBe(73);
  });

  it('maps encryption resource type to MITRE T1486', () => {
    const rule = createMockRule({ resource_type: 'encryption' });
    const template = generateDetectionRuleTemplate(rule);

    expect(template.threat).toHaveLength(1);
    expect(template.threat[0].technique[0].id).toBe('T1486');
    expect(template.threat[0].tactic.id).toBe('TA0040');
    expect(template.threat[0].tactic.reference).toContain('TA0040');
  });

  it('maps firewall resource type to MITRE T1562.004', () => {
    const rule = createMockRule({ resource_type: 'firewall' });
    const template = generateDetectionRuleTemplate(rule);

    expect(template.threat[0].technique[0].id).toBe('T1562.004');
  });
});
