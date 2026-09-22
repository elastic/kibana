/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import {
  createExpectedAnyOfToolIdsEvaluator,
  createExpectedToolCalledEvaluator,
} from './expected_tool_called';

const MANAGE_RULE = 'platform.alerting.manage_rule';
const MANAGE_ACTION_POLICY = 'platform.alerting.manage_action_policy';
const INDEX_EXPLORER = 'platform.core.index_explorer';
const LIST_INDICES = 'platform.core.list_indices';

const DISCOVERY_ALTERNATIVES = [INDEX_EXPLORER, LIST_INDICES];

const outputWithToolCalls = (toolIds: string[]): TaskOutput =>
  ({
    steps: toolIds.map((toolId) => ({ type: 'tool_call', tool_id: toolId })),
  } as unknown as TaskOutput);

describe('createExpectedToolCalledEvaluator', () => {
  const run = (output: TaskOutput, expected: Record<string, unknown> | null) =>
    createExpectedToolCalledEvaluator().evaluate({
      input: { turns: [] },
      output,
      expected: expected ?? {},
      metadata: null,
    });

  it('skips when there is no tool-call expectation', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('throws when expectedToolIds is an empty array', async () => {
    await expect(run(outputWithToolCalls([MANAGE_RULE]), { expectedToolIds: [] })).rejects.toThrow(
      /non-empty array of tool-ids/i
    );
  });

  it('scores 1 when every expected tool was called', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE, MANAGE_ACTION_POLICY]), {
      expectedToolIds: [MANAGE_RULE, MANAGE_ACTION_POLICY],
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when any expected tool was not called', async () => {
    const result = await run(outputWithToolCalls([MANAGE_ACTION_POLICY]), {
      expectedToolIds: [MANAGE_RULE],
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when no tools were called but one was expected', async () => {
    const result = await run(outputWithToolCalls([]), {
      expectedToolIds: [MANAGE_RULE],
    });
    expect(result.score).toBe(0);
  });

  it('reports the used and missing tool ids in metadata', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {
      expectedToolIds: [MANAGE_RULE, MANAGE_ACTION_POLICY],
    });
    expect(result.metadata).toEqual(
      expect.objectContaining({
        usedToolIds: [MANAGE_RULE],
        expectedToolIds: [MANAGE_RULE, MANAGE_ACTION_POLICY],
        missingToolIds: [MANAGE_ACTION_POLICY],
      })
    );
  });
});

describe('createExpectedAnyOfToolIdsEvaluator', () => {
  const run = (output: TaskOutput, expected: Record<string, unknown> | null) =>
    createExpectedAnyOfToolIdsEvaluator().evaluate({
      input: { turns: [] },
      output,
      expected: expected ?? {},
      metadata: null,
    });

  it('skips when there is no any-of expectation', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('skipped');
  });

  it('throws when expectedAnyOfToolIds is an empty array', async () => {
    await expect(
      run(outputWithToolCalls([MANAGE_RULE]), { expectedAnyOfToolIds: [] })
    ).rejects.toThrow(/non-empty array of tool-ids/i);
  });

  it('scores 1 when one alternative was called', async () => {
    const result = await run(outputWithToolCalls([INDEX_EXPLORER, MANAGE_RULE]), {
      expectedAnyOfToolIds: DISCOVERY_ALTERNATIVES,
    });
    expect(result.score).toBe(1);
  });

  it('scores 1 when the other alternative was called', async () => {
    const result = await run(outputWithToolCalls([LIST_INDICES]), {
      expectedAnyOfToolIds: DISCOVERY_ALTERNATIVES,
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when none of the alternatives were called', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {
      expectedAnyOfToolIds: DISCOVERY_ALTERNATIVES,
    });
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        expectedAnyOfToolIds: DISCOVERY_ALTERNATIVES,
        matchedToolIds: [],
        usedToolIds: [MANAGE_RULE],
      })
    );
  });
});
