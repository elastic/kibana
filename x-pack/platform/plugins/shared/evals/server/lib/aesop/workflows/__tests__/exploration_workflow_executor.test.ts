/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExplorationWorkflowExecutor } from '../exploration_workflow_executor';

const LONG_MARKDOWN = '# Skill\n\nThis markdown body is long enough to survive the length filter.';

describe('ExplorationWorkflowExecutor LLM response parsing', () => {
  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  const createExecutor = () =>
    new ExplorationWorkflowExecutor(
      {} as any,
      mockLogger,
      {} as any,
      {
        executionId: 'exec-1',
        userId: 'user-1',
        indices: [],
        analystRole: 'soc_analyst',
        roleDescription: 'SOC analyst',
        samplingConfig: {},
      } as any
    );

  const parseSkills = (response: string) =>
    (createExecutor() as any).parseLLMSkills(response) as Array<{
      confidence: number;
      name: string;
    }>;

  const parseImprovements = (response: string) =>
    (createExecutor() as any).parseSkillImprovements(response, [
      {
        id: 'skill-1',
        name: 'Base Skill',
        description: 'base description',
        content: 'base content',
        tool_ids: [],
        readonly: false,
      },
    ]) as Array<{ confidence: number; name: string; baseSkill: { id: string } }>;

  beforeEach(() => jest.clearAllMocks());

  describe('parseLLMSkills', () => {
    it('preserves an explicit confidence of 0 instead of inflating it to the default', () => {
      const skills = parseSkills(
        JSON.stringify([
          { name: 'Low Confidence', description: 'd', markdown: LONG_MARKDOWN, confidence: 0 },
        ])
      );

      expect(skills).toHaveLength(1);
      expect(skills[0].confidence).toBe(0);
    });

    it('falls back to the default confidence when the value is missing or non-numeric', () => {
      const skills = parseSkills(
        JSON.stringify([
          { name: 'Missing', description: 'd', markdown: LONG_MARKDOWN },
          { name: 'Wordy', description: 'd', markdown: LONG_MARKDOWN, confidence: 'high' },
        ])
      );

      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.confidence)).toEqual([0.8, 0.8]);
    });

    it('clamps out-of-range confidences', () => {
      const skills = parseSkills(
        JSON.stringify([
          { name: 'High', description: 'd', markdown: LONG_MARKDOWN, confidence: 1.5 },
        ])
      );

      expect(skills[0].confidence).toBe(1);
    });

    it('parses a skills array followed by prose containing brackets', () => {
      const skills = parseSkills(
        `${JSON.stringify([
          { name: 'Test Skill', description: 'd', markdown: LONG_MARKDOWN, confidence: 0.9 },
        ])} Note: see [docs] for the skill format.`
      );

      expect(skills).toHaveLength(1);
      expect(skills[0].name).toBe('Test Skill');
    });
  });

  describe('parseSkillImprovements', () => {
    it('parses improvement proposals followed by prose containing brackets', () => {
      const improvements = parseImprovements(
        `${JSON.stringify([
          {
            base_skill_id: 'skill-1',
            name: 'Improved Skill',
            description: 'd',
            markdown: LONG_MARKDOWN,
            confidence: 0.5,
          },
        ])} Note: see [docs] for the improvement format.`
      );

      expect(improvements).toHaveLength(1);
      expect(improvements[0].name).toBe('Improved Skill');
      expect(improvements[0].confidence).toBe(0.5);
      expect(improvements[0].baseSkill.id).toBe('skill-1');
    });

    it('parses improvement proposals wrapped in prose and code fences', () => {
      const improvements = parseImprovements(
        `Here are the improvements:\n\`\`\`json\n${JSON.stringify([
          {
            base_skill_id: 'skill-1',
            name: 'Improved Skill',
            description: 'd',
            markdown: LONG_MARKDOWN,
            confidence: 0.7,
          },
        ])}\n\`\`\``
      );

      expect(improvements).toHaveLength(1);
    });

    it('returns an empty array when the response carries no proposals', () => {
      expect(parseImprovements('No improvements are warranted.')).toEqual([]);
    });
  });
});
