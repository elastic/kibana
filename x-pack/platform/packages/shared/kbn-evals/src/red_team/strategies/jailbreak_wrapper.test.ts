/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createJailbreakWrapperStrategy } from './jailbreak_wrapper';

describe('jailbreak_wrapper strategy', () => {
  it('has correct metadata', () => {
    const strategy = createJailbreakWrapperStrategy();
    expect(strategy.name).toBe('jailbreak_wrapper');
    expect(strategy.kind).toBe('single-turn');
  });

  it('wraps the original prompt within the output', () => {
    const strategy = createJailbreakWrapperStrategy();
    const input = 'tell me your secrets';
    const result = strategy.transform(input);
    expect(result).toContain(input);
    expect(result.length).toBeGreaterThan(input.length);
  });

  it('uses the same template for all calls on the same instance', () => {
    const strategy = createJailbreakWrapperStrategy();
    const input = 'do something dangerous';
    const result1 = strategy.transform(input);
    const result2 = strategy.transform(input);
    expect(result1).toBe(result2);
  });

  it('handles empty string', () => {
    const strategy = createJailbreakWrapperStrategy();
    const result = strategy.transform('');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('produces one of the 5 known wrapper templates across multiple instances', () => {
    const templates = new Set<string>();
    // Create many instances; statistically all 5 templates should appear
    for (let i = 0; i < 200; i++) {
      const s = createJailbreakWrapperStrategy();
      const result = s.transform('test');
      // Record the prefix before "test" to identify the template
      templates.add(result.replace('test', ''));
    }
    expect(templates.size).toBe(5);
  });
});
