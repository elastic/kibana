/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import type { RuleManagementExample } from '../types';
import { skippedResult } from '../evaluator_utils';

interface ConversationStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

const getToolCallStepsWithParams = (output: TaskOutput): ConversationStep[] => {
  const steps = (output as { steps?: ConversationStep[] })?.steps ?? [];
  return steps.filter((s) => s?.type === 'tool_call');
};

export const getSkillsLoadedFromSteps = (output: TaskOutput): string[] => {
  const seen: string[] = [];

  for (const step of getToolCallStepsWithParams(output)) {
    if (step.tool_id === 'load_skill') {
      const skillParam = step.params?.skill;
      if (typeof skillParam === 'string') seen.push(skillParam);

      for (const result of step.results ?? []) {
        const skill = (
          result as { data?: { skill?: { name?: string; id?: string; path?: string } } }
        )?.data?.skill;
        if (typeof skill?.name === 'string') seen.push(skill.name);
        if (typeof skill?.id === 'string') seen.push(skill.id);
        if (typeof skill?.path === 'string') seen.push(skill.path);
      }
    }

    if (step.tool_id === 'read_file' || step.tool_id === 'filestore.read') {
      const path = step.params?.path;
      if (typeof path === 'string') seen.push(path);
    }
  }

  return [...new Set(seen.filter(Boolean))];
};

const skillIsPresent = (skillName: string, loadedNames: string[]): boolean => {
  const lower = skillName.toLowerCase();
  const pathSegment = lower.replace(/\./g, '/');
  return loadedNames.some((n) => {
    const nl = n.toLowerCase();
    return nl === lower || nl.endsWith(`.${lower}`) || nl.includes(`/${pathSegment}/`);
  });
};

export const createExpectedSkillEvaluator = (): Evaluator<
  RuleManagementExample,
  TaskOutput
> => ({
  name: 'ExpectedSkill',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const expectedSkills = expected?.expectedSkills;
    const notExpectedSkills = expected?.notExpectedSkills;

    if (expectedSkills == null && notExpectedSkills == null) {
      return skippedResult('No skill-load expectation for this example');
    }

    let requiredSkills: readonly string[] = [];
    if (expectedSkills != null) {
      if (!Array.isArray(expectedSkills)) {
        throw new Error('expectedSkills must be a non-empty array of skills');
      }
      requiredSkills = expectedSkills.filter(
        (skill): skill is string => typeof skill === 'string' && skill.length > 0
      );
      if (requiredSkills.length === 0) {
        throw new Error('expectedSkills must contain at least one skill');
      }
    }

    let forbiddenSkills: readonly string[] = [];
    if (notExpectedSkills != null) {
      if (!Array.isArray(notExpectedSkills)) {
        throw new Error('notExpectedSkills must be a non-empty array of skills');
      }
      forbiddenSkills = notExpectedSkills.filter(
        (skill): skill is string => typeof skill === 'string' && skill.length > 0
      );
      if (forbiddenSkills.length === 0) {
        throw new Error('notExpectedSkills must contain at least one skill');
      }
    }

    const loadedNames = getSkillsLoadedFromSteps(output as TaskOutput);
    const missingSkills = requiredSkills.filter((skill) => !skillIsPresent(skill, loadedNames));
    const unexpectedlyLoadedSkills = forbiddenSkills.filter((skill) =>
      skillIsPresent(skill, loadedNames)
    );

    const passed = missingSkills.length === 0 && unexpectedlyLoadedSkills.length === 0;

    return {
      score: passed ? 1 : 0,
      metadata: {
        expectedSkills: requiredSkills,
        missingSkills,
        notExpectedSkills: forbiddenSkills,
        unexpectedlyLoadedSkills,
        loadedNames,
      },
    };
  },
});
