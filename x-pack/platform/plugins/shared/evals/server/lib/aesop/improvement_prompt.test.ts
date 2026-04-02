/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildImprovementPrompt } from './improvement_prompt';
import type { ProposedSkillDocument, SkillEvaluatorResult } from './types';

const createSkill = (overrides?: Partial<ProposedSkillDocument>): ProposedSkillDocument => ({
  id: 'test-skill-1',
  name: 'Test Skill',
  description: 'A test skill for evaluation',
  markdown: '# Test Skill\n\nSome content here.',
  confidence: 0.8,
  ...overrides,
});

describe('buildImprovementPrompt', () => {
  it('includes skill name, description, and content', () => {
    const skill = createSkill();
    const results: SkillEvaluatorResult[] = [];

    const prompt = buildImprovementPrompt(skill, results);

    expect(prompt).toContain('Name: Test Skill');
    expect(prompt).toContain('Description: A test skill for evaluation');
    expect(prompt).toContain('# Test Skill');
  });

  it('lists failed evaluators under FAILED section', () => {
    const skill = createSkill();
    const results: SkillEvaluatorResult[] = [
      {
        evaluator: 'skill-safety',
        kind: 'LLM',
        score: 0,
        pass: false,
        explanation: 'Contains PII data',
      },
      {
        evaluator: 'skill-relevance',
        kind: 'LLM',
        score: 0.9,
        pass: true,
        explanation: 'Highly relevant',
      },
    ];

    const prompt = buildImprovementPrompt(skill, results);

    expect(prompt).toContain('### FAILED Evaluators (must fix)');
    expect(prompt).toContain('**skill-safety**');
    expect(prompt).toContain('Contains PII data');
    expect(prompt).not.toContain('**skill-relevance** (LLM, score: 0.90)');
  });

  it('lists low-score evaluators under LOW SCORE section', () => {
    const skill = createSkill();
    const results: SkillEvaluatorResult[] = [
      {
        evaluator: 'skill-completeness',
        kind: 'LLM',
        score: 0.6,
        pass: true,
        explanation: 'Missing key sections',
      },
    ];

    const prompt = buildImprovementPrompt(skill, results);

    expect(prompt).toContain('### LOW SCORE Evaluators (should improve)');
    expect(prompt).toContain('**skill-completeness**');
    expect(prompt).toContain('Missing key sections');
  });

  it('sorts failed evaluators before low-score ones', () => {
    const skill = createSkill();
    const results: SkillEvaluatorResult[] = [
      {
        evaluator: 'skill-completeness',
        kind: 'LLM',
        score: 0.5,
        pass: true,
        explanation: 'Low completeness',
      },
      {
        evaluator: 'backing-index-validator',
        kind: 'CODE',
        score: 0,
        pass: false,
        explanation: 'Uses backing index',
      },
    ];

    const prompt = buildImprovementPrompt(skill, results);

    const failedIdx = prompt.indexOf('FAILED Evaluators');
    const lowScoreIdx = prompt.indexOf('LOW SCORE Evaluators');

    expect(failedIdx).toBeLessThan(lowScoreIdx);
    expect(prompt).toContain('**backing-index-validator**');
  });

  it('omits FAILED section when all evaluators pass', () => {
    const skill = createSkill();
    const results: SkillEvaluatorResult[] = [
      {
        evaluator: 'skill-relevance',
        kind: 'LLM',
        score: 0.7,
        pass: true,
        explanation: 'Good relevance',
      },
    ];

    const prompt = buildImprovementPrompt(skill, results);

    expect(prompt).not.toContain('### FAILED Evaluators');
    expect(prompt).toContain('### LOW SCORE Evaluators');
  });

  it('omits LOW SCORE section when all passing evaluators score >= 0.8', () => {
    const skill = createSkill();
    const results: SkillEvaluatorResult[] = [
      {
        evaluator: 'skill-safety',
        kind: 'LLM',
        score: 0,
        pass: false,
        explanation: 'Failed safety',
      },
      {
        evaluator: 'skill-relevance',
        kind: 'LLM',
        score: 0.9,
        pass: true,
        explanation: 'Excellent',
      },
    ];

    const prompt = buildImprovementPrompt(skill, results);

    expect(prompt).toContain('### FAILED Evaluators');
    expect(prompt).not.toContain('### LOW SCORE Evaluators');
  });

  it('includes instructions for JSON response format', () => {
    const skill = createSkill();
    const prompt = buildImprovementPrompt(skill, []);

    expect(prompt).toContain('Return the improved skill in this JSON format');
    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"description"');
    expect(prompt).toContain('"markdown"');
  });

  it('handles evaluator results with null scores', () => {
    const skill = createSkill();
    const results: SkillEvaluatorResult[] = [
      {
        evaluator: 'errored-eval',
        kind: 'CODE',
        score: null,
        pass: false,
        explanation: 'Evaluator errored',
      },
    ];

    const prompt = buildImprovementPrompt(skill, results);

    expect(prompt).toContain('**errored-eval**');
    expect(prompt).toContain('score: null');
  });
});
