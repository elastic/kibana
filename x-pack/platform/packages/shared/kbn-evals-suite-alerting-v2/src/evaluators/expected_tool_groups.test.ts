/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import { createExpectedToolGroupsEvaluator } from './expected_tool_groups';

const GET_INDEX_MAPPING = 'platform.core.get_index_mapping';
const INDEX_EXPLORER = 'platform.core.index_explorer';
const LIST_INDICES = 'platform.core.list_indices';
const MANAGE_RULE = 'platform.alerting.manage_rule';

const GROUNDING_GROUPS = [[GET_INDEX_MAPPING], [INDEX_EXPLORER, LIST_INDICES]];

const outputWithToolCalls = (toolIds: string[]): TaskOutput =>
  ({
    steps: toolIds.map((toolId) => ({ type: 'tool_call', tool_id: toolId })),
  } as unknown as TaskOutput);

const run = (output: TaskOutput, metadata: Record<string, unknown> | null) =>
  createExpectedToolGroupsEvaluator().evaluate({
    input: {},
    output,
    expected: {},
    metadata,
  });

describe('createExpectedToolGroupsEvaluator', () => {
  it('scores 1 when there is no group expectation', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {});
    expect(result.score).toBe(1);
  });

  it('scores 1 when every group is satisfied (mapping + explorer)', async () => {
    const result = await run(
      outputWithToolCalls([GET_INDEX_MAPPING, INDEX_EXPLORER, MANAGE_RULE]),
      {
        expectedToolGroups: GROUNDING_GROUPS,
      }
    );
    expect(result.score).toBe(1);
  });

  it('scores 1 when the OR group is satisfied via the alternative (mapping + list)', async () => {
    const result = await run(outputWithToolCalls([GET_INDEX_MAPPING, LIST_INDICES]), {
      expectedToolGroups: GROUNDING_GROUPS,
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when the required mapping tool is missing', async () => {
    const result = await run(outputWithToolCalls([INDEX_EXPLORER, MANAGE_RULE]), {
      expectedToolGroups: GROUNDING_GROUPS,
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({ unsatisfiedGroups: [[GET_INDEX_MAPPING]] })
    );
  });

  it('scores 0 when the OR group has no match (only mapping called)', async () => {
    const result = await run(outputWithToolCalls([GET_INDEX_MAPPING, MANAGE_RULE]), {
      expectedToolGroups: GROUNDING_GROUPS,
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({ unsatisfiedGroups: [[INDEX_EXPLORER, LIST_INDICES]] })
    );
  });

  it('scores 0 when neither group is satisfied', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {
      expectedToolGroups: GROUNDING_GROUPS,
    });
    expect(result.score).toBe(0);
  });
});
