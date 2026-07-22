/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import { createExpectedToolCalledEvaluator } from './expected_tool_called';

const MANAGE_RULE = 'platform.alerting.manage_rule';
const MANAGE_ACTION_POLICY = 'platform.alerting.manage_action_policy';

const outputWithToolCalls = (toolIds: string[]): TaskOutput =>
  ({
    steps: toolIds.map((toolId) => ({ type: 'tool_call', tool_id: toolId })),
  } as unknown as TaskOutput);

const run = (output: TaskOutput, metadata: Record<string, unknown> | null) =>
  createExpectedToolCalledEvaluator().evaluate({
    input: {},
    output,
    expected: {},
    metadata,
  });

describe('createExpectedToolCalledEvaluator', () => {
  it('scores 1 when there is no tool-call expectation', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {});
    expect(result.score).toBe(1);
  });

  it('scores 1 when the expected tool was called', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {
      expectedToolId: MANAGE_RULE,
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when the expected tool was not called', async () => {
    const result = await run(outputWithToolCalls([MANAGE_ACTION_POLICY]), {
      expectedToolId: MANAGE_RULE,
    });
    expect(result.score).toBe(0);
  });

  it('scores 0 when no tools were called but one was expected', async () => {
    const result = await run(outputWithToolCalls([]), {
      expectedToolId: MANAGE_RULE,
    });
    expect(result.score).toBe(0);
  });

  it('scores 1 when a forbidden tool was not called', async () => {
    const result = await run(outputWithToolCalls([]), {
      forbiddenToolId: MANAGE_RULE,
    });
    expect(result.score).toBe(1);
  });

  it('scores 0 when a forbidden tool was called', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {
      forbiddenToolId: MANAGE_RULE,
    });
    expect(result.score).toBe(0);
  });

  it('requires both expected present and forbidden absent', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE, MANAGE_ACTION_POLICY]), {
      expectedToolId: MANAGE_RULE,
      forbiddenToolId: MANAGE_ACTION_POLICY,
    });
    expect(result.score).toBe(0);
  });

  it('reports the used tool ids in metadata', async () => {
    const result = await run(outputWithToolCalls([MANAGE_RULE]), {
      expectedToolId: MANAGE_RULE,
    });
    expect(result.metadata).toEqual(
      expect.objectContaining({ usedToolIds: [MANAGE_RULE], expectedToolId: MANAGE_RULE })
    );
  });
});
