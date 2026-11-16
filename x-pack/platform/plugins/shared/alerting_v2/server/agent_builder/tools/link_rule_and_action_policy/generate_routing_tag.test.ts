/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TAG_LENGTH } from '@kbn/alerting-v2-constants';
import { generateRoutingTag } from './generate_routing_tag';

const RULE_ID = '3f2a9c1b-7d4e-4a55-9c0e-1b2c3d4e5f60';

describe('generateRoutingTag', () => {
  it('builds a slug of the rule name plus a suffix of the rule id', () => {
    expect(generateRoutingTag({ ruleName: 'High CPU usage', ruleId: RULE_ID })).toBe(
      'high-cpu-usage-b4a605da'
    );
  });

  it('is deterministic for the same name and id', () => {
    const input = { ruleName: 'High CPU usage', ruleId: RULE_ID };

    expect(generateRoutingTag(input)).toBe(generateRoutingTag(input));
  });

  it('does not collide for rules with the same name but different ids', () => {
    const first = generateRoutingTag({ ruleName: 'Errors', ruleId: RULE_ID });
    const second = generateRoutingTag({
      ruleName: 'Errors',
      ruleId: '9a8b7c6d-0000-4000-8000-000000000000',
    });

    expect(first).not.toBe(second);
  });

  it('strips accents, punctuation and surrounding separators', () => {
    expect(
      generateRoutingTag({ ruleName: '  ¡Latencia más alta: API/Pagos!  ', ruleId: RULE_ID })
    ).toBe('latencia-mas-alta-api-pagos-b4a605da');
  });

  it('truncates long names without leaving a trailing separator', () => {
    const tag = generateRoutingTag({
      ruleName: `${'a'.repeat(39)} ${'b'.repeat(30)}`,
      ruleId: RULE_ID,
    });

    expect(tag).toBe(`${'a'.repeat(39)}-b4a605da`);
    expect(tag.length).toBeLessThanOrEqual(MAX_TAG_LENGTH);
  });

  it.each([undefined, '', '   ', '!!!', '日本語'])(
    'falls back to the "rule" prefix when the name has no usable characters (%p)',
    (ruleName) => {
      expect(generateRoutingTag({ ruleName, ruleId: RULE_ID })).toBe('rule-b4a605da');
    }
  );

  it('does not collide for client-supplied ids that share their first characters', () => {
    const first = generateRoutingTag({ ruleName: 'High CPU', ruleId: 'cpu-alert-01' });
    const second = generateRoutingTag({ ruleName: 'High CPU', ruleId: 'cpu-alert-02' });

    expect(first).toBe('high-cpu-58f910bd');
    expect(second).toBe('high-cpu-ce835fbf');
  });
});
