/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const systemPrompt = readFileSync(join(__dirname, 'system_prompt.text'), 'utf8');

describe('criteria evaluator system prompt', () => {
  it('preserves the PASS / FAIL / N/A decision guidance', () => {
    expect(systemPrompt).toMatch(/PASS/);
    expect(systemPrompt).toMatch(/FAIL/);
    expect(systemPrompt).toMatch(/N\/A/);
  });

  it('instructs the judge to evaluate criteria literally as written', () => {
    expect(systemPrompt).toMatch(/[Ee]valuate (the )?criteria as written/);
  });

  it('clarifies that "called with X" must not require successful resolution', () => {
    expect(systemPrompt).toMatch(/called with/i);
    expect(systemPrompt).toMatch(/regardless of (whether|the)/i);
    expect(systemPrompt).toMatch(/successful resolution|non-empty result/i);
  });

  it('includes a worked example showing PASS when a tool was called but returned no data', () => {
    expect(systemPrompt).toMatch(/not found|no entity found|returned ["']?not found["']?/i);
    expect(systemPrompt).toMatch(/PASS/);
  });
});
