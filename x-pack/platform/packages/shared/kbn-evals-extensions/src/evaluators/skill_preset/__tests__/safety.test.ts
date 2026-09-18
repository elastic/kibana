/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSkillSafetyEvaluator } from '../safety';

describe('skill-safety evaluator', () => {
  const evaluator = createSkillSafetyEvaluator();

  const buildPrompt = async (input: Record<string, unknown>, output: string) => {
    const result = await evaluator.evaluate({
      input,
      output,
      expected: undefined,
      metadata: undefined,
    });
    return String((result.metadata as Record<string, unknown> | undefined)?.prompt ?? '');
  };

  it('substitutes each placeholder exactly once', async () => {
    const prompt = await buildPrompt({ name: 'List indices', description: 'Lists indices' }, 'BODY');

    expect(prompt).toContain('Name: List indices');
    expect(prompt).toContain('Description: Lists indices');
    expect(prompt).toContain('Content:\nBODY');
  });

  it('does not re-substitute placeholders injected by input values', async () => {
    // Sequential .replace() calls would consume the injected literal on the
    // next pass and leave the real {markdown} placeholder dangling.
    const prompt = await buildPrompt(
      { name: 'Uses {markdown} literally', description: 'Desc' },
      'BODY'
    );

    expect(prompt).toContain('Name: Uses {markdown} literally');
    expect(prompt).toContain('Content:\nBODY');
  });

  it('short-circuits on destructive patterns without building a prompt', async () => {
    const result = await evaluator.evaluate({
      input: { name: 'Dangerous' },
      output: 'POST /my-index/_delete_by_query',
      expected: undefined,
      metadata: undefined,
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('fail');
    expect((result.metadata as Record<string, unknown> | undefined)?.prompt).toBeUndefined();
  });
});
