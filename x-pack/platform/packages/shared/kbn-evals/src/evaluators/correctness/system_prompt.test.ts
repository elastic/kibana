/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const systemPrompt = readFileSync(join(__dirname, 'system_prompt.text'), 'utf8');
const relevanceRules = systemPrompt.slice(
  systemPrompt.indexOf('`relevance_summary`'),
  systemPrompt.indexOf('`sequence_accuracy_summary`')
);

describe('correctness evaluator system prompt', () => {
  it('defines relevance_summary in terms of the centrality tags with mutually exclusive rules', () => {
    expect(relevanceRules).toMatch(/`RELEVANT`: .*every claim is `central`/);
    expect(relevanceRules).toMatch(
      /`IRRELEVANT`: Fewer than half of the claims are `central`, OR no claim addresses/
    );
    expect(relevanceRules).toMatch(/`PARTIALLY_RELEVANT`: Anything else/);
  });

  it('tells the judge an empty response yields zero claims and no meta-claims', () => {
    expect(relevanceRules).toMatch(/empty or non-answer response yields zero claims/);
    expect(relevanceRules).toMatch(/Never emit claims about the response itself/);
  });

  it('keeps the factuality and sequence rules', () => {
    expect(systemPrompt).toMatch(/`MAJOR_INACCURACIES`: Contains `CONTRADICTED`/);
    expect(systemPrompt).toMatch(/`MISMATCH`: One or more central claims has a sequence_match/);
  });
});
