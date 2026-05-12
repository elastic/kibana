/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillPiiEvaluator } from '../skill_pii';

describe('skill_pii evaluator', () => {
  const evaluator = createSkillPiiEvaluator();

  const evaluate = (output: string) =>
    evaluator.evaluate({ input: undefined, output, expected: undefined, metadata: undefined });

  it('should pass when no PII is found', async () => {
    const result = await evaluate('FROM logs-* | WHERE process.name == "svchost.exe" | LIMIT 100');
    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });

  it('should detect hard-coded email addresses', async () => {
    const result = await evaluate('Contact john.doe@realcompany.com for support');
    expect(result.score).toBe(0.0);
    expect(result.label).toBe('fail');
    expect(result.explanation).toContain('email');
  });

  it('should not flag safe email patterns', async () => {
    const result = await evaluate('Contact test@example.com for testing');
    expect(result.score).toBe(1.0);
  });

  it('should detect SSN patterns', async () => {
    const result = await evaluate('SSN: 123-45-6789');
    expect(result.score).toBe(0.0);
    expect(result.explanation).toContain('ssn');
  });

  it('should detect credit card number patterns', async () => {
    // Use a pattern that matches the Visa format but is clearly test data
    const result = await evaluate('Card: 4111-1111-1111-1111');
    expect(result.score).toBe(0.0);
    expect(result.explanation).toContain('credit-card');
  });

  it('should detect generic secret assignment patterns', async () => {
    // A long random-looking value assigned to a secret key
    const secretValue = 'a'.repeat(25);
    const result = await evaluate(`secret = "${secretValue}"`);
    expect(result.score).toBe(0.0);
    expect(result.explanation).toContain('generic-secret');
  });

  it('should not flag template variables', async () => {
    const result = await evaluate('Send alert to {user.email} when threshold exceeded');
    expect(result.score).toBe(1.0);
  });

  it('should report multiple PII types', async () => {
    const result = await evaluate('Contact john@realco.org, SSN: 123-45-6789');
    expect(result.score).toBe(0.0);
    const metadata = result.metadata as { grouped: Record<string, number> };
    expect(Object.keys(metadata.grouped).length).toBeGreaterThanOrEqual(2);
  });

  it('has correct name and kind', () => {
    expect(evaluator.name).toBe('skill-pii');
    expect(evaluator.kind).toBe('CODE');
  });
});
