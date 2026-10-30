/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRuleBuilderType, RULE_BUILDER_TYPES } from './registry';
import { thresholdRuleBuilderType } from './threshold/definition';

describe('RULE_BUILDER_TYPES', () => {
  it('keys every builder by its type', () => {
    for (const [key, builder] of Object.entries(RULE_BUILDER_TYPES)) {
      expect(builder.type).toBe(key);
    }
  });

  it('gives every builder a unique draft tool name', () => {
    const toolNames = Object.values(RULE_BUILDER_TYPES).map(({ toolName }) => toolName);

    expect(new Set(toolNames).size).toBe(toolNames.length);
    expect(toolNames.every((name) => /^draft_[a-z0-9_]+_rule$/.test(name))).toBe(true);
  });
});

describe('getRuleBuilderType', () => {
  it('returns the threshold builder', () => {
    expect(getRuleBuilderType('threshold')).toBe(thresholdRuleBuilderType);
  });

  it('returns undefined for unknown types and inherited object keys', () => {
    expect(getRuleBuilderType('unknown')).toBeUndefined();
    expect(getRuleBuilderType('toString')).toBeUndefined();
  });
});
