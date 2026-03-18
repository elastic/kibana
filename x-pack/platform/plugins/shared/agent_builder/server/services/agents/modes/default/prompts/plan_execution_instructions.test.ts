/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plan } from '@kbn/agent-builder-common';
import { getPlanExecutionInstructions } from './plan_execution_instructions';

const createPlan = (overrides: Partial<Plan> = {}): Plan => ({
  title: 'Test Plan',
  action_items: [],
  status: 'ready',
  source: 'agent',
  ...overrides,
});

describe('getPlanExecutionInstructions', () => {
  it('includes plan title in heading', () => {
    const plan = createPlan({ title: 'My Custom Plan' });
    const result = getPlanExecutionInstructions(plan);

    expect(result).toContain('## Active Plan: "My Custom Plan"');
  });

  it('includes description when present', () => {
    const plan = createPlan({
      description: 'A detailed plan for testing the system.',
    });
    const result = getPlanExecutionInstructions(plan);

    expect(result).toContain('Description: A detailed plan for testing the system.');
  });

  it('omits description when not present', () => {
    const plan = createPlan();
    const result = getPlanExecutionInstructions(plan);

    expect(result).not.toContain('Description:');
  });

  it('formats items with index and status', () => {
    const plan = createPlan({
      action_items: [
        { description: 'First task', status: 'pending' },
        { description: 'Second task', status: 'in_progress' },
      ],
    });
    const result = getPlanExecutionInstructions(plan);

    expect(result).toContain('  0. [pending] First task');
    expect(result).toContain('  1. [in_progress] Second task');
  });

  it('includes tool references when present', () => {
    const plan = createPlan({
      action_items: [
        {
          description: 'Search for logs',
          status: 'pending',
          related_tools: ['platform.search', 'esql'],
        },
      ],
    });
    const result = getPlanExecutionInstructions(plan);

    expect(result).toContain('[pending] Search for logs (tools: platform.search, esql)');
  });

  it('handles multiple items with mixed statuses', () => {
    const plan = createPlan({
      action_items: [
        { description: 'Completed item', status: 'completed' },
        { description: 'Failed item', status: 'failed' },
        { description: 'Pending item', status: 'pending', related_tools: ['tool_a'] },
      ],
    });
    const result = getPlanExecutionInstructions(plan);

    expect(result).toContain('  0. [completed] Completed item');
    expect(result).toContain('  1. [failed] Failed item');
    expect(result).toContain('  2. [pending] Pending item (tools: tool_a)');
  });

  it('includes execution guidelines', () => {
    const plan = createPlan();
    const result = getPlanExecutionInstructions(plan);

    expect(result).toContain('### Plan Execution Guidelines');
    expect(result).toContain('`planning.update_plan`');
    expect(result).toContain('Do not skip items unless they are already completed');
  });
});
