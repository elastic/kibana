/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createBackingIndexValidator } from '../backing_index_validator';

describe('backing_index_validator', () => {
  const evaluator = createBackingIndexValidator();

  const evaluate = (output: string) =>
    evaluator.evaluate({ input: undefined, output, expected: undefined, metadata: undefined });

  it('should pass when no backing index references exist', async () => {
    const result = await evaluate(
      'FROM logs-endpoint.events.process-* | WHERE process.name == "malware.exe"'
    );
    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });

  it('should detect data stream backing indices', async () => {
    const result = await evaluate(
      'Query the index .ds-logs-endpoint.events.process-default-2024.01.15-000001 for malware'
    );
    expect(result.score).toBe(0.0);
    expect(result.label).toBe('fail');
    expect(result.explanation).toContain(
      '.ds-logs-endpoint.events.process-default-2024.01.15-000001'
    );
    expect(result.explanation).toContain('logs-endpoint.events.process-default');
  });

  it('should detect internal alert backing indices', async () => {
    const result = await evaluate(
      'Check .internal.alerts-security.alerts-default-000001 for active alerts'
    );
    expect(result.score).toBe(0.0);
    expect(result.label).toBe('fail');
    expect(result.explanation).toContain('.internal.alerts-security.alerts-default-000001');
  });

  it('should detect multiple backing index references', async () => {
    const result = await evaluate(
      'FROM .ds-logs-endpoint.events.process-default-2024.01.15-000001 | ' +
        'JOIN .internal.alerts-security.alerts-default-000001'
    );
    expect(result.score).toBe(0.0);
    expect(result.metadata).toHaveProperty('issues');
    const issues = (result.metadata as { issues: unknown[] }).issues;
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it('should suggest correct data stream name for .ds- indices', async () => {
    const result = await evaluate('.ds-logs-endpoint.events.process-default-2024.01.01-000001');
    expect(result.explanation).toContain('logs-endpoint.events.process-default');
  });

  it('should handle non-string output', async () => {
    const result = await evaluate(
      JSON.stringify({ query: 'FROM .ds-logs-test-2024.01.01-000001' })
    );
    expect(result.score).toBe(0.0);
  });

  it('should pass for normal index patterns', async () => {
    const result = await evaluate('FROM logs-* | WHERE @timestamp > now() - 1h');
    expect(result.score).toBe(1.0);
  });

  it('has correct name and kind', () => {
    expect(evaluator.name).toBe('backing-index-validator');
    expect(evaluator.kind).toBe('CODE');
  });
});
