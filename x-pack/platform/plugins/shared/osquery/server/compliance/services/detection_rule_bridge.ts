/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComplianceRuleMetadata } from '../../../common/compliance';
import { COMPLIANCE_FINDINGS_INDEX_PATTERN } from '../../../common/compliance';

const MITRE_MAPPING: Record<
  string,
  { technique_id: string; technique_name: string; tactic: string; tactic_id: string }
> = {
  encryption: {
    technique_id: 'T1486',
    technique_name: 'Data Encrypted for Impact',
    tactic: 'Impact',
    tactic_id: 'TA0040',
  },
  firewall: {
    technique_id: 'T1562.004',
    technique_name: 'Disable or Modify System Firewall',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
  patching: {
    technique_id: 'T1211',
    technique_name: 'Exploitation for Defense Evasion',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
  session: {
    technique_id: 'T1078',
    technique_name: 'Valid Accounts',
    tactic: 'Persistence',
    tactic_id: 'TA0003',
  },
  access_control: {
    technique_id: 'T1021.004',
    technique_name: 'Remote Services: SSH',
    tactic: 'Lateral Movement',
    tactic_id: 'TA0008',
  },
  network: {
    technique_id: 'T1090',
    technique_name: 'Proxy',
    tactic: 'Command and Control',
    tactic_id: 'TA0011',
  },
  account: {
    technique_id: 'T1078',
    technique_name: 'Valid Accounts',
    tactic: 'Persistence',
    tactic_id: 'TA0003',
  },
  audit: {
    technique_id: 'T1562.002',
    technique_name: 'Disable Windows Event Logging',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
  privilege: {
    technique_id: 'T1548',
    technique_name: 'Abuse Elevation Control Mechanism',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
  antivirus: {
    technique_id: 'T1562.001',
    technique_name: 'Disable or Modify Tools',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
  integrity: {
    technique_id: 'T1036',
    technique_name: 'Masquerading',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
  password_policy: {
    technique_id: 'T1110',
    technique_name: 'Brute Force',
    tactic: 'Credential Access',
    tactic_id: 'TA0006',
  },
  file_permissions: {
    technique_id: 'T1222',
    technique_name: 'File and Directory Permissions Modification',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
  filesystem: {
    technique_id: 'T1006',
    technique_name: 'Direct Volume Access',
    tactic: 'Defense Evasion',
    tactic_id: 'TA0005',
  },
};

export interface DetectionRuleTemplate {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  type: 'threshold';
  index: string[];
  query: string;
  threshold: { field: string[]; value: number };
  tags: string[];
  threat: Array<{
    framework: string;
    tactic: { id: string; name: string; reference: string };
    technique: Array<{ id: string; name: string; reference: string }>;
  }>;
}

export const generateDetectionRuleTemplate = (
  rule: ComplianceRuleMetadata
): DetectionRuleTemplate => {
  const mitre = MITRE_MAPPING[rule.resource_type];
  const severity = rule.level === 1 ? 'medium' : 'high';
  const riskScore = rule.level === 1 ? 47 : 73;

  const tags = [
    'Compliance',
    'CIS',
    'Endpoint',
    rule.benchmark.id,
    rule.section,
    `compliance-rule:${rule.rule_id}`,
  ];

  const threat = mitre
    ? [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: mitre.tactic_id,
            name: mitre.tactic,
            reference: `https://attack.mitre.org/tactics/${mitre.tactic_id}/`,
          },
          technique: [
            {
              id: mitre.technique_id,
              name: mitre.technique_name,
              reference: `https://attack.mitre.org/techniques/${mitre.technique_id.replace(
                '.',
                '/'
              )}/`,
            },
          ],
        },
      ]
    : [];

  return {
    name: `Compliance: ${rule.name}`,
    description: `Endpoint compliance check failed: ${rule.description}`,
    severity,
    risk_score: riskScore,
    type: 'threshold',
    index: [COMPLIANCE_FINDINGS_INDEX_PATTERN],
    query: `result.evaluation: "failed" AND rule.id: "${rule.rule_id}"`,
    threshold: { field: ['host.id'], value: 1 },
    tags,
    threat,
  };
};

export const generateBulkDetectionRules = (
  rules: ComplianceRuleMetadata[],
  existingTags: string[] = []
): { templates: DetectionRuleTemplate[]; skipped: string[] } => {
  const templates: DetectionRuleTemplate[] = [];
  const skipped: string[] = [];

  for (const rule of rules) {
    const ruleTag = `compliance-rule:${rule.rule_id}`;
    if (existingTags.includes(ruleTag)) {
      skipped.push(rule.rule_id);
      continue;
    }

    templates.push(generateDetectionRuleTemplate(rule));
  }

  return { templates, skipped };
};
