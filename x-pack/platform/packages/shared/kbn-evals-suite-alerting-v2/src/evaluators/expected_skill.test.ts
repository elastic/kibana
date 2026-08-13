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

const run = (output: TaskOutput, expected: Record<string, unknown> | null) =>
  createExpectedSkillEvaluator().evaluate({
    input: { turns: [] },
    output,
    expected: expected ?? {},
    metadata: null,
  });

describe('createExpectedSkillEvaluator', () => {
  it('skips when there is no skill-load expectation', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('throws when expectedSkills is an empty array', async () => {
    await expect(
      run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), { expectedSkills: [] })
    ).rejects.toThrow(/non-empty array of skills/i);
  });

  it('throws when notExpectedSkills is an empty array', async () => {
    await expect(run(outputWithLoadedSkills([]), { notExpectedSkills: [] })).rejects.toThrow(
      /non-empty array of skills/i
    );
  });

  it('scores 1 when every expected skill was loaded', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {
      expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when an expected skill was not loaded', async () => {
    const result = await run(outputWithLoadedSkills(['detection-rule-edit']), {
      expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when no skills were loaded but one was expected', async () => {
    const result = await run(outputWithLoadedSkills([]), {
      expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
    });
    expect(result.score).toBe(0);
  });

  it('scores 1 when no forbidden skill was loaded', async () => {
    const result = await run(outputWithLoadedSkills([]), {
      notExpectedSkills: [RULE_MANAGEMENT_SKILL_ID],
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when a forbidden skill was loaded', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {
      notExpectedSkills: [RULE_MANAGEMENT_SKILL_ID],
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({ unexpectedlyLoadedSkills: [RULE_MANAGEMENT_SKILL_ID] })
    );
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

    const result = await run(output, { expectedSkills: [RULE_MANAGEMENT_SKILL_ID] });
    expect(result.score).toBe(1);
  });

  it('reports the loaded skill names in metadata', async () => {
    const result = await run(outputWithLoadedSkills([RULE_MANAGEMENT_SKILL_ID]), {
      expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
    });
    expect(result.metadata).toEqual(
      expect.objectContaining({
        loadedNames: [RULE_MANAGEMENT_SKILL_ID],
        expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
      })
    );
  });
});
