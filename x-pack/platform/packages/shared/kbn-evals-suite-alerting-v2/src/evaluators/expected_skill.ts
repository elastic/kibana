/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStringMeta, type Evaluator, type TaskOutput } from '@kbn/evals';

// Raw step shape returned by the agent-builder converse API.
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

/**
 * Extracts every skill identifier seen in a conversation's tool-call steps.
 *
 * Collects values from three sources:
 * - `load_skill` params: the skill name string passed to the tool
 * - `load_skill` results: the `skill.name`, `skill.id`, and `skill.path` returned by the server
 * - `read_file` / `filestore.read` params: the path used to read the SKILL.md file
 *
 * Adapted from the agent-builder suite's `getSkillsLoadedFromSteps`.
 */
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

/**
 * Returns true if `skillName` (the path-segment name, e.g. 'rule-management')
 * is present in the list of collected skill identifiers.
 *
 * Matches against three forms that may appear in `loadedNames`:
 * - Exact name: 'rule-management'
 * - Dot-prefixed ID: 'platform.rule-management' → name = 'rule-management'
 * - Filestore path: 'skills/platform/alerting/.../SKILL.md' (or similar)
 */
const skillIsPresent = (skillName: string, loadedNames: string[]): boolean => {
  const lower = skillName.toLowerCase();
  const pathSegment = lower.replace(/\./g, '/');
  return loadedNames.some((n) => {
    const nl = n.toLowerCase();
    return nl === lower || nl.endsWith(`.${lower}`) || nl.includes(`/${pathSegment}/`);
  });
};

const getStringArrayMeta = (metadata: unknown, key: string): string[] => {
  const value = (metadata as Record<string, unknown> | null)?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
};

/**
 * CODE evaluator that checks skill-load routing for a single example.
 *
 * Reads expectations from the example metadata:
 * - `expectedSkill`: the conversation must load this skill at least once.
 * - `expectedSkills`: the conversation must load **every** skill in this list
 *   at least once (for multi-skill flows like rule compose → notification setup).
 * - `shouldNotActivateSkill`: the conversation must NOT load this skill.
 *
 * When none are set the example has no skill-routing expectation and scores 1 (n/a).
 *
 * Adapted from the agent-builder suite's skill-selection evaluators.
 */
export const createExpectedSkillEvaluator = (): Evaluator => ({
  name: 'ExpectedSkill',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const expectedSkill = getStringMeta(metadata, 'expectedSkill');
    const expectedSkillList = getStringArrayMeta(metadata, 'expectedSkills');
    const shouldNotActivateSkill = getStringMeta(metadata, 'shouldNotActivateSkill');

    const expectedSkills = [...(expectedSkill ? [expectedSkill] : []), ...expectedSkillList];

    if (expectedSkills.length === 0 && !shouldNotActivateSkill) {
      return { score: 1, metadata: { reason: 'No skill-load expectation for this example' } };
    }

    const loadedNames = getSkillsLoadedFromSteps(output as TaskOutput);

    const missingSkills = expectedSkills.filter((skill) => !skillIsPresent(skill, loadedNames));

    const checks: boolean[] = [missingSkills.length === 0];
    if (shouldNotActivateSkill) {
      checks.push(!skillIsPresent(shouldNotActivateSkill, loadedNames));
    }

    const passed = checks.every(Boolean);

    return {
      score: passed ? 1 : 0,
      metadata: {
        expectedSkill,
        expectedSkills,
        missingSkills,
        shouldNotActivateSkill,
        loadedNames,
      },
    };
  },
});
