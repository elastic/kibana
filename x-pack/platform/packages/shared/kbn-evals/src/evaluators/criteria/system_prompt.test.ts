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
    expect(systemPrompt).toMatch(
      /not found|no entity found|returned ["']?not found["']?|ENOENT|no such file/i
    );
    expect(systemPrompt).toMatch(/PASS/);
  });

  it('instructs the judge to treat disjunctive ("OR") criteria as satisfied by either branch', () => {
    expect(systemPrompt).toMatch(/disjunctive/i);
    expect(systemPrompt).toMatch(
      /either branch is sufficient|satisfying\s+\*?\*?either\*?\*?\s+branch|\beither\s+branch\b/i
    );
    expect(systemPrompt).toMatch(/do not (require both|treat the unfulfilled branch)/i);
  });

  it('includes a worked example for a disjunctive criterion satisfied by the second branch', () => {
    expect(systemPrompt).toMatch(/Example B|disjunctive criterion/i);
    expect(systemPrompt).toMatch(
      /clearly state (that )?no .* (data )?is (not )?available|no login data is available/i
    );
  });

  it('explains that conjunctive ("AND") criteria require both parts to hold', () => {
    expect(systemPrompt).toMatch(/conjunctive/i);
    expect(systemPrompt).toMatch(/both parts must hold/i);
  });

  it('carves out an Exception for criteria that explicitly require success or a return value', () => {
    expect(systemPrompt).toMatch(/\*\*Exception:\*\*/);
    expect(systemPrompt).toMatch(/successfully executes|returns|catches/i);
    expect(systemPrompt).toMatch(/resolution matters|evaluate (the )?return|evaluate resolution/i);
  });
});
