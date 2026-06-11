/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildRuleOnRuleTags,
  extractMonitoredRuleIdFromTags,
  extractStreamNameFromTags,
  isRuleOnRuleTagSet,
} from './tags';
import { UNKNOWN_STREAM_TAG } from './constants';

describe('rule_on_rule tags', () => {
  it('builds expected tag set', () => {
    expect(
      buildRuleOnRuleTags({ streamName: 'logs', monitoredRuleId: 'rule-1' })
    ).toEqual([
      'sigevents:rule-on-rule',
      'sigevents:rule-on-rule:logs',
      'sigevents:monitored:rule-1',
      'sigevents:system-managed',
    ]);
  });

  it('extracts stream and monitored ids', () => {
    const tags = buildRuleOnRuleTags({ streamName: 'logs', monitoredRuleId: 'rule-1' });
    expect(extractStreamNameFromTags(tags)).toBe('logs');
    expect(extractMonitoredRuleIdFromTags(tags)).toBe('rule-1');
  });

  it('falls back to unknown stream', () => {
    expect(extractStreamNameFromTags(['sigevents:rule-on-rule'])).toBe(UNKNOWN_STREAM_TAG);
  });

  it('detects rule-on-rule tag set', () => {
    expect(isRuleOnRuleTagSet(['sigevents:rule-on-rule'])).toBe(true);
    expect(isRuleOnRuleTagSet(['sigevents:stream:logs'])).toBe(false);
  });
});
