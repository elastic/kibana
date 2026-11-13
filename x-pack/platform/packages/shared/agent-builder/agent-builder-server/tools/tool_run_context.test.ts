/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContextStackEntry } from '../runner';
import { getToolRunContext } from './tool_run_context';

const runContextWith = (stack: RunContextStackEntry[]) => ({
  runContext: { runId: 'run-1', stack },
});

describe('getToolRunContext', () => {
  it.each([
    ['no agent on the stack', [{ type: 'tool' as const, toolId: 'tool-1' }]],
    ['an agent without ids', [{ type: 'agent' as const, agentId: 'agent-1', executionId: 'e' }]],
  ])('returns undefined for %s', (_label, stack) => {
    expect(getToolRunContext(runContextWith(stack))).toBeUndefined();
  });

  it('reads the ids from the innermost agent', () => {
    const context = runContextWith([
      { type: 'agent', agentId: 'parent', conversationId: 'conv-0', rootExecutionId: 'exec-0' },
      { type: 'agent', agentId: 'child', conversationId: 'conv-1', rootExecutionId: 'exec-1' },
      { type: 'tool', toolId: 'tool-1' },
    ]);

    expect(getToolRunContext(context)).toEqual({
      conversationId: 'conv-1',
      executionId: 'exec-1',
    });
  });

  it("sends the root execution, not the run's own", () => {
    const context = runContextWith([
      { type: 'agent', agentId: 'sub-agent', executionId: 'exec-2', rootExecutionId: 'exec-1' },
    ]);

    expect(getToolRunContext(context)).toEqual({ executionId: 'exec-1' });
  });
});
