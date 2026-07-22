/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import { RULE_MANAGEMENT_SKILL_ID, WORKFLOW_AUTHORING_SKILL_ID } from '../constants';
import { createExpectedSkillEvaluator } from './expected_skill';

const outputWithLoadedSkills = (skillNames: string[]): TaskOutput =>
  ({
    steps: skillNames.map((skill) => ({
      type: 'tool_call',
      tool_id: 'load_skill',
      params: { skill },
    })),
  } as unknown as TaskOutput);

const run = (output: TaskOutput, metadata: Record<string, unknown> | null) =>
  createExpectedSkillEvaluator().evaluate({
    input: {},
    output,
    expected: {},
    metadata,
  });

describe('createExpectedSkillEvaluator', () => {
  it('scores 1 when there is no skill-load expectation', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {});
    expect(result.score).toBe(1);
  });

  it('scores 1 when the expected skill was loaded', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {
      expectedSkill: RULE_MANAGEMENT_SKILL_ID,
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when the expected skill was not loaded', async () => {
    const result = await run(outputWithLoadedSkills(['detection-rule-edit']), {
      expectedSkill: RULE_MANAGEMENT_SKILL_ID,
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when no skills were loaded but one was expected', async () => {
    const result = await run(outputWithLoadedSkills([]), {
      expectedSkill: RULE_MANAGEMENT_SKILL_ID,
    });
    expect(result.score).toBe(0);
  });

  it('scores 1 when a forbidden skill was not loaded', async () => {
    const result = await run(outputWithLoadedSkills([]), {
      shouldNotActivateSkill: RULE_MANAGEMENT_SKILL_ID,
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when a forbidden skill was loaded', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {
      shouldNotActivateSkill: RULE_MANAGEMENT_SKILL_ID,
    });
    expect(result.score).toBe(0);
  });

  it('scores 1 when every skill in expectedSkills was loaded', async () => {
    const result = await run(
      outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID, WORKFLOW_AUTHORING_SKILL_ID]),
      { expectedSkills: [RULE_MANAGEMENT_SKILL_ID, WORKFLOW_AUTHORING_SKILL_ID] }
    );
    expect(result.score).toBe(1);
  });

  it('scores 0 when any skill in expectedSkills was not loaded', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {
      expectedSkills: [RULE_MANAGEMENT_SKILL_ID, WORKFLOW_AUTHORING_SKILL_ID],
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({ missingSkills: [WORKFLOW_AUTHORING_SKILL_ID] })
    );
  });

  it('combines expectedSkill and expectedSkills (all must load)', async () => {
    const result = await run(outputWithLoadedSkills([WORKFLOW_AUTHORING_SKILL_ID]), {
      expectedSkill: RULE_MANAGEMENT_SKILL_ID,
      expectedSkills: [WORKFLOW_AUTHORING_SKILL_ID],
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({ missingSkills: [RULE_MANAGEMENT_SKILL_ID] })
    );
  });

  it('matches expectedSkills against filestore skill paths', async () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'filestore.read',
          params: { path: 'skills/platform/workflows/workflow-authoring/SKILL.md' },
        },
      ],
    } as unknown as TaskOutput;

    const result = await run(output, { expectedSkills: [WORKFLOW_AUTHORING_SKILL_ID] });
    expect(result.score).toBe(1);
  });

  it('matches skill names from load_skill results', async () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'load_skill',
          params: {},
          results: [{ data: { skill: { id: RULE_MANAGEMENT_SKILL_ID, name: 'rule-management' } } }],
        },
      ],
    } as unknown as TaskOutput;

    const result = await run(output, { expectedSkill: RULE_MANAGEMENT_SKILL_ID });
    expect(result.score).toBe(1);
  });

  it('reports the loaded skill names in metadata', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {
      expectedSkill: RULE_MANAGEMENT_SKILL_ID,
    });
    expect(result.metadata).toEqual(
      expect.objectContaining({
        loadedNames: [RULE_MANAGEMENT_SKILL_ID],
        expectedSkill: RULE_MANAGEMENT_SKILL_ID,
      })
    );
  });
});
