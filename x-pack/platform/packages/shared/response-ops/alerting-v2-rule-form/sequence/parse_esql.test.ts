/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSequenceEsql, buildSequenceRecoveryEsql } from './build_esql';
import { parseSequenceEsql } from './parse_esql';
import type { SequenceFormValues } from './form_types';
import { generateStepId } from './form_types';

const makeRule = (id: string, groupingFields: string[] = []) => ({
  ruleId: id,
  ruleName: id,
  groupingFields,
  kind: 'alert' as const,
});

const roundTrip = (state: SequenceFormValues) => {
  const breach = buildSequenceEsql(state);
  const recovery = buildSequenceRecoveryEsql(state);
  return parseSequenceEsql(breach, recovery);
};

describe('parseSequenceEsql', () => {
  it('returns null for an empty string', () => {
    expect(parseSequenceEsql('')).toBeNull();
  });

  it('returns null for a non-sequence query', () => {
    expect(parseSequenceEsql('FROM logs-* | WHERE status >= 500')).toBeNull();
  });

  describe('round-trip — two OR steps, no correlation', () => {
    const original: SequenceFormValues = {
      steps: [
        { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
        { id: generateStepId(), rules: [makeRule('rule-b')], operator: 'or' },
      ],
      hopWindows: [{ value: 5, unit: 'm' }],
      recoveryStepIndex: 1,
    };

    it('reconstructs the step count', () => {
      expect(roundTrip(original)?.steps).toHaveLength(2);
    });

    it('reconstructs rule IDs', () => {
      const parsed = roundTrip(original)!;
      expect(parsed.steps[0].rules[0].ruleId).toBe('rule-a');
      expect(parsed.steps[1].rules[0].ruleId).toBe('rule-b');
    });

    it('reconstructs hop windows', () => {
      const parsed = roundTrip(original)!;
      expect(parsed.hopWindows[0].value).toBe(5);
      expect(parsed.hopWindows[0].unit).toBe('m');
    });

    it('reconstructs recoveryStepIndex=last', () => {
      expect(roundTrip(original)?.recoveryStepIndex).toBe(1);
    });
  });

  describe('round-trip — explicit custom single-step recovery preserves recoveryStepIndices', () => {
    it('preserves recoveryStepIndices for a non-last explicit custom step', () => {
      const original: SequenceFormValues = {
        steps: [
          { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
          { id: generateStepId(), rules: [makeRule('rule-b')], operator: 'or' },
          { id: generateStepId(), rules: [makeRule('rule-c')], operator: 'or' },
        ],
        hopWindows: [
          { value: 5, unit: 'm' },
          { value: 10, unit: 'm' },
        ],
        recoveryStepIndex: 1,
        recoveryStepIndices: [1],
      };
      const parsed = roundTrip(original)!;
      expect(parsed.recoveryStepIndex).toBe(1);
      expect(parsed.recoveryStepIndices).toEqual([1]);
    });

    it('preserves recoveryStepIndices when the last step is explicitly chosen as custom', () => {
      const original: SequenceFormValues = {
        steps: [
          { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
          { id: generateStepId(), rules: [makeRule('rule-b')], operator: 'or' },
        ],
        hopWindows: [{ value: 5, unit: 'm' }],
        recoveryStepIndex: 1,
        recoveryStepIndices: [1],
      };
      const parsed = roundTrip(original)!;
      expect(parsed.recoveryStepIndex).toBe(1);
      expect(parsed.recoveryStepIndices).toEqual([1]);
    });
  });

  describe('round-trip — correlated, custom recovery step', () => {
    const original: SequenceFormValues = {
      steps: [
        { id: generateStepId(), rules: [makeRule('rule-a', ['host.name'])], operator: 'or' },
        { id: generateStepId(), rules: [makeRule('rule-b', ['host.name'])], operator: 'or' },
        { id: generateStepId(), rules: [makeRule('rule-c', ['host.name'])], operator: 'or' },
      ],
      hopWindows: [
        { value: 5, unit: 'm' },
        { value: 10, unit: 'm' },
      ],
      recoveryStepIndex: 0,
    };

    it('reconstructs 3 steps', () => {
      expect(roundTrip(original)?.steps).toHaveLength(3);
    });

    it('reconstructs both hop windows', () => {
      const parsed = roundTrip(original)!;
      expect(parsed.hopWindows[0].value).toBe(5);
      expect(parsed.hopWindows[0].unit).toBe('m');
      expect(parsed.hopWindows[1].value).toBe(10);
      expect(parsed.hopWindows[1].unit).toBe('m');
    });

    it('reconstructs recoveryStepIndex=0', () => {
      expect(roundTrip(original)?.recoveryStepIndex).toBe(0);
    });
  });

  describe('round-trip — OR step with multiple rules', () => {
    const original: SequenceFormValues = {
      steps: [
        { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
        {
          id: generateStepId(),
          rules: [makeRule('rule-b'), makeRule('rule-c')],
          operator: 'or',
        },
      ],
      hopWindows: [{ value: 15, unit: 'm' }],
      recoveryStepIndex: 1,
    };

    it('reconstructs 2 rules in step 1', () => {
      const parsed = roundTrip(original)!;
      expect(parsed.steps[1].rules).toHaveLength(2);
      expect(parsed.steps[1].rules.map((r) => r.ruleId)).toEqual(['rule-b', 'rule-c']);
    });

    it('step 1 operator is or', () => {
      expect(roundTrip(original)?.steps[1].operator).toBe('or');
    });
  });

  describe('round-trip — AND step', () => {
    const original: SequenceFormValues = {
      steps: [
        { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
        {
          id: generateStepId(),
          rules: [makeRule('rule-b'), makeRule('rule-c')],
          operator: 'and',
        },
      ],
      hopWindows: [{ value: 5, unit: 'm' }],
      recoveryStepIndex: 1,
    };

    it('reconstructs operator=and for step 1', () => {
      expect(roundTrip(original)?.steps[1].operator).toBe('and');
    });

    it('reconstructs 2 rules in AND step', () => {
      const parsed = roundTrip(original)!;
      expect(parsed.steps[1].rules).toHaveLength(2);
      expect(parsed.steps[1].rules.map((r) => r.ruleId)).toEqual(['rule-b', 'rule-c']);
    });
  });

  it('converts seconds back to the most readable hop window unit (minutes)', () => {
    const original: SequenceFormValues = {
      steps: [
        { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
        { id: generateStepId(), rules: [makeRule('rule-b')], operator: 'or' },
      ],
      hopWindows: [{ value: 2, unit: 'h' }],
      recoveryStepIndex: 1,
    };
    const parsed = roundTrip(original)!;
    expect(parsed.hopWindows[0].value).toBe(2);
    expect(parsed.hopWindows[0].unit).toBe('h');
  });

  describe('edge cases', () => {
    it('returns null for whitespace-only query', () => {
      expect(parseSequenceEsql('   \n\t  ')).toBeNull();
    });

    it('returns null when only one step can be parsed', () => {
      const query = [
        'FROM .rule-events',
        '| WHERE type == "alert" AND rule.id IN ("rule-a")',
        '| STATS t_0 = VALUES(CASE(rule.id == "rule-a" AND type == "alert" AND status == "breached", @timestamp, NULL))',
      ].join('\n');
      expect(parseSequenceEsql(query)).toBeNull();
    });

    it('returns null when hop windows are missing', () => {
      const query = [
        'FROM .rule-events',
        '| WHERE type == "alert" AND rule.id IN ("rule-a", "rule-b")',
        '| STATS t_0 = VALUES(CASE(rule.id == "rule-a" AND type == "alert" AND status == "breached", @timestamp, NULL)),',
        '    t_1 = VALUES(CASE(rule.id == "rule-b" AND type == "alert" AND status == "breached", @timestamp, NULL))',
        '    BY group_hash',
        '| MV_EXPAND t_0',
        '| MV_EXPAND t_1',
        '| WHERE t_0 IS NOT NULL AND t_1 IS NOT NULL',
      ].join('\n');
      expect(parseSequenceEsql(query)).toBeNull();
    });

    it('handles rule IDs with escaped quotes', () => {
      const original: SequenceFormValues = {
        steps: [
          { id: generateStepId(), rules: [makeRule('rule-with-"quotes"')], operator: 'or' },
          { id: generateStepId(), rules: [makeRule('rule-b')], operator: 'or' },
        ],
        hopWindows: [{ value: 5, unit: 'm' }],
        recoveryStepIndex: 1,
      };
      const parsed = roundTrip(original)!;
      expect(parsed.steps[0].rules[0].ruleId).toBe('rule-with-"quotes"');
    });
  });

  describe('signal rule detection', () => {
    const makeSignalRule = (id: string, groupingFields: string[] = []) => ({
      ruleId: id,
      ruleName: id,
      groupingFields,
      kind: 'signal' as const,
    });

    it('detects signal rules in single tracking recovery', () => {
      const original: SequenceFormValues = {
        steps: [
          { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
          { id: generateStepId(), rules: [makeSignalRule('signal-b')], operator: 'or' },
        ],
        hopWindows: [{ value: 5, unit: 'm' }],
        recoveryStepIndex: 1,
      };
      const parsed = roundTrip(original)!;
      expect(parsed.steps[1].rules[0].kind).toBe('signal');
    });

    it('detects signal rules in multi-tracking recovery', () => {
      const original: SequenceFormValues = {
        steps: [
          { id: generateStepId(), rules: [makeRule('alert-a')], operator: 'or' },
          { id: generateStepId(), rules: [makeSignalRule('signal-b')], operator: 'or' },
        ],
        hopWindows: [{ value: 5, unit: 'm' }],
        recoveryStepIndex: 0,
        recoveryStepIndices: [0, 1],
      };
      const parsed = roundTrip(original)!;
      expect(parsed.steps[0].rules[0].kind).toBe('alert');
      expect(parsed.steps[1].rules[0].kind).toBe('signal');
    });

    it('keeps all rules as alert when no signal type filter', () => {
      const original: SequenceFormValues = {
        steps: [
          { id: generateStepId(), rules: [makeRule('rule-a')], operator: 'or' },
          { id: generateStepId(), rules: [makeRule('rule-b')], operator: 'or' },
        ],
        hopWindows: [{ value: 5, unit: 'm' }],
        recoveryStepIndex: 1,
      };
      const parsed = roundTrip(original)!;
      expect(parsed.steps[0].rules[0].kind).toBe('alert');
      expect(parsed.steps[1].rules[0].kind).toBe('alert');
    });
  });
});
