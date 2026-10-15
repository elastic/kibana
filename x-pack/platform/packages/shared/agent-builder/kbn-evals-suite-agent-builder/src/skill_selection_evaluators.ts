/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, TaskOutput } from '@kbn/evals';
import type { BenchmarkExample } from '../evals/skill_selection/benchmark_dataset';

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
 * - `filestore.read` params: the path used to read the SKILL.md file
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
 * Returns true if `skillName` (the path-segment name, e.g. 'investigation', 'threat-hunting')
 * is present in the list of collected skill identifiers.
 *
 * Matches against three forms that may appear in `loadedNames`:
 * - Exact name: 'threat-hunting'
 * - Dot-prefixed ID: 'observability.investigation' → name = 'investigation'
 * - Filestore path: 'skills/observability/investigation/SKILL.md'
 */
const skillIsPresent = (skillName: string, loadedNames: string[]): boolean => {
  const lower = skillName.toLowerCase();
  const pathSegment = lower.replace(/\./g, '/');
  return loadedNames.some((n) => {
    const nl = n.toLowerCase();
    return nl === lower || nl.endsWith(`.${lower}`) || nl.includes(`/${pathSegment}/skill.md`);
  });
};

/**
 * Creates an evaluator that asserts the given skill was loaded.
 *
 * Use for `direct` and `indirect` query types in the benchmark.
 * `skillName` must be the skill's directory-segment name (e.g. `'investigation'`, not
 * `'observability.investigation'`).
 */
export const createExpectedSkillEvaluator = (skillName: string): Evaluator => ({
  name: `Expected Skill (${skillName})`,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const loadedNames = getSkillsLoadedFromSteps(output);
    const loaded = skillIsPresent(skillName, loadedNames);
    return {
      score: loaded ? 1 : 0,
      label: loaded ? 'PASS' : 'FAIL',
      explanation: loaded
        ? `Skill '${skillName}' was loaded. Identifiers seen: ${loadedNames.join(', ') || 'n/a'}`
        : `Skill '${skillName}' was NOT loaded. Identifiers seen: ${
            loadedNames.join(', ') || 'none'
          }`,
      metadata: { skillName, loadedNames, loaded },
    };
  },
});

/**
 * Creates an evaluator that asserts the given skill was NOT loaded.
 *
 * Use for `distractor` query types in the benchmark: tests that the agent does not
 * mistakenly activate a neighboring skill when routing a query away from it.
 */
export const createShouldNotActivateSkillEvaluator = (skillName: string): Evaluator => ({
  name: `Skill Not Activated (${skillName})`,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }): Promise<EvaluationResult> => {
    const loadedNames = getSkillsLoadedFromSteps(output);
    const loaded = skillIsPresent(skillName, loadedNames);
    const passed = !loaded;
    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Skill '${skillName}' correctly did not activate. Identifiers seen: ${
            loadedNames.join(', ') || 'none'
          }`
        : `Skill '${skillName}' incorrectly activated. Identifiers seen: ${loadedNames.join(', ')}`,
      metadata: { skillName, loadedNames, loaded },
    };
  },
});

/**
 * Evaluates whether the implicit `<relevant_skills>` pre-selection surfaced the correct skill
 * before the agent acts.
 *
 * Checks the `relevant_skills` step with `source: 'implicit'` in the output steps (the fast-model
 * call that runs at the start of each round when the `relevantSkills` experiment flag is on).
 * Returns `score: null / label: 'SKIP'` when the step is absent — meaning the feature is
 * disabled or the skill list was below the threshold that bypasses the model call.
 *
 * Ground truth keys (same as {@link skillSelectionEvaluator}):
 * - `expectedSkill` — must appear in the pre-selected list. Score 1 if found.
 * - `shouldNotActivateSkill` — must NOT appear in the pre-selected list. Score 1 if absent.
 */
export const preSelectionEvaluator: Evaluator = {
  name: 'Pre-Selection Recall',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
    const { expectedSkill, shouldNotActivateSkill } =
      (expected as BenchmarkExample['output']) ?? {};

    if (!expectedSkill && !shouldNotActivateSkill) {
      return {
        score: 1,
        label: 'SKIP',
        explanation: 'No skill routing assertion in expected output',
      };
    }

    const steps = (output as { steps?: Array<Record<string, unknown>> })?.steps ?? [];
    const preSelectStep = steps.find(
      (s) => s.type === 'relevant_skills' && s.source === 'implicit'
    );

    if (!preSelectStep) {
      return {
        score: null,
        label: 'SKIP',
        explanation:
          'No implicit relevant_skills step — feature disabled, or skill list below threshold',
      };
    }

    const surfaced =
      (preSelectStep.skills as Array<{ id?: string; name?: string; path?: string }>) ?? [];
    const surfacedNames = surfaced.flatMap((s) =>
      [s.id, s.name, s.path].filter((v): v is string => typeof v === 'string')
    );
    const surfacedIds = surfaced.map((s) => s.id).filter(Boolean);

    if (expectedSkill) {
      const found = skillIsPresent(expectedSkill, surfacedNames);
      return {
        score: found ? 1 : 0,
        label: found ? 'PASS' : 'FAIL',
        explanation: found
          ? `Skill '${expectedSkill}' was surfaced in pre-selection. Skills shown: ${surfacedIds.join(
              ', '
            )}`
          : `Skill '${expectedSkill}' was NOT surfaced in pre-selection. Skills shown: ${
              surfacedIds.join(', ') || 'none'
            }`,
        metadata: { expectedSkill, surfacedSkillIds: surfacedIds, found },
      };
    }

    const activated = skillIsPresent(shouldNotActivateSkill!, surfacedNames);
    const passed = !activated;
    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Skill '${shouldNotActivateSkill}' correctly absent from pre-selection. Skills shown: ${
            surfacedIds.join(', ') || 'none'
          }`
        : `Skill '${shouldNotActivateSkill}' incorrectly surfaced in pre-selection. Skills shown: ${surfacedIds.join(
            ', '
          )}`,
      metadata: { shouldNotActivateSkill, surfacedSkillIds: surfacedIds, activated },
    };
  },
};

/**
 * A single generic evaluator that reads routing assertions from example ground truth
 * (`expected`, i.e. `example.output`) and evaluates the conversation against them.
 *
 * Ground truth keys (in `example.output`, not metadata):
 * - `expectedSkill` — the skill name that must be loaded. Score 1 if loaded.
 * - `shouldNotActivateSkill` — the skill name that must NOT be loaded. Score 1 if absent.
 *
 * When neither key is present the example is skipped (score 1, label 'SKIP').
 */
export const skillSelectionEvaluator: Evaluator = {
  name: 'Skill Selection',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
    const { expectedSkill, shouldNotActivateSkill } =
      (expected as BenchmarkExample['output']) ?? {};

    if (!expectedSkill && !shouldNotActivateSkill) {
      return {
        score: 1,
        label: 'SKIP',
        explanation: 'No skill routing assertion in expected output',
      };
    }

    const loadedNames = getSkillsLoadedFromSteps(output);

    if (expectedSkill) {
      const loaded = skillIsPresent(expectedSkill, loadedNames);
      return {
        score: loaded ? 1 : 0,
        label: loaded ? 'PASS' : 'FAIL',
        explanation: loaded
          ? `Expected skill '${expectedSkill}' was loaded. Identifiers seen: ${loadedNames.join(
              ', '
            )}`
          : `Expected skill '${expectedSkill}' was NOT loaded. Identifiers seen: ${
              loadedNames.join(', ') || 'none'
            }`,
        metadata: { expectedSkill, loadedNames, loaded },
      };
    }

    const loaded = skillIsPresent(shouldNotActivateSkill!, loadedNames);
    const passed = !loaded;
    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: passed
        ? `Skill '${shouldNotActivateSkill}' correctly did not activate. Identifiers seen: ${
            loadedNames.join(', ') || 'none'
          }`
        : `Skill '${shouldNotActivateSkill}' incorrectly activated. Identifiers seen: ${loadedNames.join(
            ', '
          )}`,
      metadata: { shouldNotActivateSkill, loadedNames, loaded },
    };
  },
};
