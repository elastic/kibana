/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsqlPatternEvaluator } from '../esql_pattern';

describe('esql_pattern evaluator', () => {
  const evaluator = createEsqlPatternEvaluator();

  const evaluate = (output: string) =>
    evaluator.evaluate({ input: undefined, output, expected: undefined, metadata: undefined });

  it('should pass when no ES|QL queries are present', async () => {
    const result = await evaluate('This is a plain text description with no queries.');
    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });

  it('should pass for a valid bounded ES|QL query', async () => {
    const content = `
\`\`\`esql
FROM logs-endpoint.events.process-*
| WHERE process.name == "malware.exe"
| LIMIT 100
\`\`\`
    `;
    const result = await evaluate(content);
    expect(result.score).toBe(1.0);
    expect(result.label).toBe('pass');
  });

  it('should warn about unbounded queries', async () => {
    const content = `
\`\`\`esql
FROM logs-endpoint.events.process-*
| STATS count = COUNT(*) BY process.name
\`\`\`
    `;
    const result = await evaluate(content);
    // STATS without WHERE or LIMIT is unbounded
    expect(result.score).toBeLessThan(1.0);
    expect(result.explanation).toContain('Unbounded query');
  });

  it('should error on queries not starting with FROM/ROW/SHOW/META', async () => {
    const content = `
\`\`\`esql
WHERE process.name == "test"
| LIMIT 10
\`\`\`
    `;
    const result = await evaluate(content);
    expect(result.score).toBeLessThan(1.0);
    expect(result.explanation).toContain('should start with FROM');
  });

  it('should warn about unknown commands', async () => {
    const content = `
\`\`\`esql
FROM logs-*
| FOOBAR something
| LIMIT 10
\`\`\`
    `;
    const result = await evaluate(content);
    expect(result.score).toBeLessThan(1.0);
    expect(result.explanation).toContain('FOOBAR');
  });

  it('should detect empty STATS command', async () => {
    const content = `
\`\`\`esql
FROM logs-*
| STATS
| LIMIT 10
\`\`\`
    `;
    const result = await evaluate(content);
    expect(result.score).toBeLessThan(1.0);
    expect(result.explanation).toContain('Empty STATS');
  });

  it('should validate multiple queries independently', async () => {
    const content = `
\`\`\`esql
FROM logs-*
| WHERE @timestamp > now() - 1h
| LIMIT 100
\`\`\`

\`\`\`esql
FROM alerts-*
| STATS count = COUNT(*) BY kibana.alert.rule.name
| SORT count DESC
| LIMIT 20
\`\`\`
    `;
    const result = await evaluate(content);
    expect(result.score).toBe(1.0);
    expect((result.metadata as { queryCount: number }).queryCount).toBe(2);
  });

  it('has correct name and kind', () => {
    expect(evaluator.name).toBe('esql-pattern');
    expect(evaluator.kind).toBe('CODE');
  });
});
