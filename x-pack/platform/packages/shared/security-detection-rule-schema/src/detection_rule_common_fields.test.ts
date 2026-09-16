/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  detectionRuleCommonFields,
  threatTacticSchema,
  threatSubtechniqueSchema,
  threatTechniqueSchema,
  threatEntrySchema,
  DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS,
} from './detection_rule_common_fields';
import { DETECTION_RULE_TYPE_OWNERSHIP } from './type_ownership_map';
import { securityDetectionQuery } from './custom_query';
import { securityDetectionThreshold } from './threshold_definition';

// Build a closed schema that replicates how each rule type uses the fragment.
const commonSchema = z.object(detectionRuleCommonFields).strict();

// ---------------------------------------------------------------------------
// Valid-example parse
// ---------------------------------------------------------------------------

describe('detectionRuleCommonFields – valid example', () => {
  const minimal = {
    severity: 'high' as const,
    risk_score: 73,
  };

  it('parses a minimal valid example (only required fields)', () => {
    const result = commonSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBe('high');
      expect(result.data.risk_score).toBe(73);
    }
  });

  it('parses a fully-populated example with all optional fields', () => {
    const full = {
      severity: 'critical' as const,
      risk_score: 99,
      max_signals: 500,
      threat: [
        {
          framework: 'MITRE ATT&CK',
          tactic: {
            id: 'TA0002',
            name: 'Execution',
            reference: 'https://attack.mitre.org/tactics/TA0002/',
          },
          technique: [
            {
              id: 'T1059',
              name: 'Command and Scripting Interpreter',
              reference: 'https://attack.mitre.org/techniques/T1059/',
              subtechnique: [
                {
                  id: 'T1059.001',
                  name: 'PowerShell',
                  reference: 'https://attack.mitre.org/techniques/T1059/001/',
                },
              ],
            },
          ],
        },
      ],
      setup: 'Install Sysmon.',
      note: 'Investigation notes.',
      references: ['https://example.org/writeup'],
      false_positives: ['Known-good process'],
      author: ['security-team'],
      license: 'Elastic License 2.0',
      related_integrations: [{ package: 'windows', version: '^1.0.0' }],
      required_fields: [{ name: 'process.args', type: 'keyword', ecs: true }],
    };

    const result = commonSchema.safeParse(full);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bound violations – each field's constraint
// ---------------------------------------------------------------------------

describe('detectionRuleCommonFields – bound violations', () => {
  const base = { severity: 'low' as const, risk_score: 0 };

  it('rejects an unknown severity value', () => {
    const result = commonSchema.safeParse({ ...base, severity: 'extreme' });
    expect(result.success).toBe(false);
  });

  it('rejects a risk_score below 0', () => {
    const result = commonSchema.safeParse({ ...base, risk_score: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects a risk_score above 100', () => {
    const result = commonSchema.safeParse({ ...base, risk_score: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects a risk_score that is not an integer', () => {
    const result = commonSchema.safeParse({ ...base, risk_score: 7.5 });
    expect(result.success).toBe(false);
  });

  it('rejects max_signals below 1', () => {
    const result = commonSchema.safeParse({ ...base, max_signals: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects max_signals above 10000', () => {
    const result = commonSchema.safeParse({ ...base, max_signals: 10001 });
    expect(result.success).toBe(false);
  });

  it('rejects a threat array exceeding 5 entries', () => {
    const entry = {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'Initial Access', reference: 'https://example.com/' },
    };
    const result = commonSchema.safeParse({ ...base, threat: Array(6).fill(entry) });
    expect(result.success).toBe(false);
  });

  it('rejects a threat technique array exceeding 5 entries', () => {
    const technique = {
      id: 'T1059',
      name: 'Cmd',
      reference: 'https://example.com/',
    };
    const entry = {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'IA', reference: 'https://example.com/' },
      technique: Array(6).fill(technique),
    };
    const result = commonSchema.safeParse({ ...base, threat: [entry] });
    expect(result.success).toBe(false);
  });

  it('rejects a threat subtechnique array exceeding 3 entries', () => {
    const sub = { id: 'T1059.001', name: 'PS', reference: 'https://example.com/' };
    const technique = {
      id: 'T1059',
      name: 'Cmd',
      reference: 'https://example.com/',
      subtechnique: Array(4).fill(sub),
    };
    const entry = {
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'IA', reference: 'https://example.com/' },
      technique: [technique],
    };
    const result = commonSchema.safeParse({ ...base, threat: [entry] });
    expect(result.success).toBe(false);
  });

  it('rejects a setup string exceeding 8192 characters', () => {
    const result = commonSchema.safeParse({ ...base, setup: 'x'.repeat(8193) });
    expect(result.success).toBe(false);
  });

  it('rejects a note string exceeding 8192 characters', () => {
    const result = commonSchema.safeParse({ ...base, note: 'x'.repeat(8193) });
    expect(result.success).toBe(false);
  });

  it('rejects a references array exceeding 32 entries', () => {
    const result = commonSchema.safeParse({
      ...base,
      references: Array(33).fill('https://example.org/'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a reference string exceeding 1024 characters', () => {
    const result = commonSchema.safeParse({ ...base, references: ['x'.repeat(1025)] });
    expect(result.success).toBe(false);
  });

  it('rejects a false_positives array exceeding 16 entries', () => {
    const result = commonSchema.safeParse({
      ...base,
      false_positives: Array(17).fill('known-good'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an author array exceeding 16 entries', () => {
    const result = commonSchema.safeParse({
      ...base,
      author: Array(17).fill('alice'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an author string exceeding 256 characters', () => {
    const result = commonSchema.safeParse({ ...base, author: ['x'.repeat(257)] });
    expect(result.success).toBe(false);
  });

  it('rejects a license string exceeding 256 characters', () => {
    const result = commonSchema.safeParse({ ...base, license: 'x'.repeat(257) });
    expect(result.success).toBe(false);
  });

  it('rejects a related_integrations array exceeding 16 entries', () => {
    const entry = { package: 'windows', version: '^1.0.0' };
    const result = commonSchema.safeParse({
      ...base,
      related_integrations: Array(17).fill(entry),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a related_integrations package name exceeding 64 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      related_integrations: [{ package: 'x'.repeat(65), version: '^1.0.0' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a related_integrations version exceeding 32 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      related_integrations: [{ package: 'windows', version: 'x'.repeat(33) }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a required_fields array exceeding 32 entries', () => {
    const field = { name: 'process.name', type: 'keyword', ecs: true };
    const result = commonSchema.safeParse({
      ...base,
      required_fields: Array(33).fill(field),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a required_fields name exceeding 128 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      required_fields: [{ name: 'x'.repeat(129), type: 'keyword', ecs: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a required_fields type exceeding 64 characters', () => {
    const result = commonSchema.safeParse({
      ...base,
      required_fields: [{ name: 'process.name', type: 'x'.repeat(65), ecs: true }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys at the top level (strict)', () => {
    const result = commonSchema.safeParse({ ...base, unknown_key: true });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys on threatTacticSchema (strict)', () => {
    const result = threatTacticSchema.safeParse({
      id: 'TA0001',
      name: 'IA',
      reference: 'https://example.com/',
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys on threatTechniqueSchema (strict)', () => {
    const result = threatTechniqueSchema.safeParse({
      id: 'T1059',
      name: 'Cmd',
      reference: 'https://example.com/',
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra keys on threatEntrySchema (strict)', () => {
    const result = threatEntrySchema.safeParse({
      framework: 'MITRE ATT&CK',
      tactic: { id: 'TA0001', name: 'IA', reference: 'https://example.com/' },
      extra: 'nope',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Exported sub-schemas parse correctly
// ---------------------------------------------------------------------------

describe('threatSubtechniqueSchema', () => {
  it('is the same shape as threatTacticSchema', () => {
    const data = { id: 'T1059.001', name: 'PowerShell', reference: 'https://example.com/' };
    expect(threatSubtechniqueSchema.safeParse(data).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fragment sub-field mapping constants
// ---------------------------------------------------------------------------

describe('DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS', () => {
  it('declares risk_score as integer', () => {
    expect(DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS.risk_score).toEqual({ type: 'integer' });
  });

  it('declares max_signals as integer', () => {
    expect(DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS.max_signals).toEqual({ type: 'integer' });
  });

  it('declares note as text', () => {
    expect(DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS.note).toEqual({ type: 'text' });
  });

  it('declares setup as text', () => {
    expect(DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS.setup).toEqual({ type: 'text' });
  });

  it('does not include query (each type owns that sub-field itself)', () => {
    expect(DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS).not.toHaveProperty('query');
  });
});

// ---------------------------------------------------------------------------
// Type-to-ownership map
// ---------------------------------------------------------------------------

describe('DETECTION_RULE_TYPE_OWNERSHIP', () => {
  it('maps security.detection.query to the security/detection ownership', () => {
    expect(DETECTION_RULE_TYPE_OWNERSHIP['security.detection.query']).toEqual({
      solution: 'security',
      domain: 'detection',
    });
  });

  it('maps security.detection.threshold to the security/detection ownership', () => {
    expect(DETECTION_RULE_TYPE_OWNERSHIP['security.detection.threshold']).toEqual({
      solution: 'security',
      domain: 'detection',
    });
  });

  it('agrees with securityDetectionQuery.ownership so the backfill and the registration gate cannot drift', () => {
    expect(DETECTION_RULE_TYPE_OWNERSHIP[securityDetectionQuery.type]).toEqual(
      securityDetectionQuery.ownership
    );
  });

  it('agrees with securityDetectionThreshold.ownership so the backfill and the registration gate cannot drift', () => {
    expect(DETECTION_RULE_TYPE_OWNERSHIP[securityDetectionThreshold.type]).toEqual(
      securityDetectionThreshold.ownership
    );
  });
});
