/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Plan } from '@kbn/agent-builder-common';
import { PlanStatusBadge } from './plan_status_badge';

const createPlan = (overrides: Partial<Plan> = {}): Plan => ({
  title: 'Test Plan',
  action_items: [
    { description: 'Step 1', status: 'pending' },
    { description: 'Step 2', status: 'pending' },
  ],
  status: 'draft',
  source: 'planning',
  ...overrides,
});

describe('PlanStatusBadge', () => {
  it('shows "Draft" for draft plans in planning mode', () => {
    const plan = createPlan({ status: 'draft', source: 'planning' });
    render(<PlanStatusBadge plan={plan} agentMode="planning" />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('Draft');
  });

  it('shows "Ready" for ready plans in planning mode', () => {
    const plan = createPlan({ status: 'ready', source: 'planning' });
    render(<PlanStatusBadge plan={plan} agentMode="planning" />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('Ready');
  });

  it('shows "Executing" when actively executing even if plan status is draft', () => {
    const plan = createPlan({
      status: 'draft',
      source: 'planning',
      action_items: [
        { description: 'Step 1', status: 'pending' },
        { description: 'Step 2', status: 'pending' },
      ],
    });
    render(<PlanStatusBadge plan={plan} agentMode="agent" isExecuting />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('Executing');
  });

  it('shows "Executing" when actively executing with ready plan', () => {
    const plan = createPlan({
      status: 'ready',
      source: 'planning',
      action_items: [
        { description: 'Step 1', status: 'completed' },
        { description: 'Step 2', status: 'in_progress' },
      ],
    });
    render(<PlanStatusBadge plan={plan} agentMode="agent" isExecuting />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('Executing');
  });

  it('shows "In Progress" when idle in agent mode with partial progress', () => {
    const plan = createPlan({
      status: 'ready',
      source: 'planning',
      action_items: [
        { description: 'Step 1', status: 'completed' },
        { description: 'Step 2', status: 'pending' },
      ],
    });
    render(<PlanStatusBadge plan={plan} agentMode="agent" isExecuting={false} />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('In Progress');
  });

  it('shows "In Progress" when idle in agent mode even with draft status if items have progress', () => {
    const plan = createPlan({
      status: 'draft',
      source: 'agent',
      action_items: [
        { description: 'Step 1', status: 'completed' },
        { description: 'Step 2', status: 'pending' },
      ],
    });
    render(<PlanStatusBadge plan={plan} agentMode="agent" isExecuting={false} />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('In Progress');
  });

  it('shows "Draft" for draft plans in agent mode with no progress and not executing', () => {
    const plan = createPlan({
      status: 'draft',
      source: 'planning',
      action_items: [
        { description: 'Step 1', status: 'pending' },
        { description: 'Step 2', status: 'pending' },
      ],
    });
    render(<PlanStatusBadge plan={plan} agentMode="agent" isExecuting={false} />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('Draft');
  });

  it('shows "Completed" when all items are completed', () => {
    const plan = createPlan({
      status: 'ready',
      source: 'planning',
      action_items: [
        { description: 'Step 1', status: 'completed' },
        { description: 'Step 2', status: 'completed' },
      ],
    });
    render(<PlanStatusBadge plan={plan} agentMode="agent" />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('Completed');
  });

  it('shows "Completed" even if plan status is draft when all items completed', () => {
    const plan = createPlan({
      status: 'draft',
      source: 'agent',
      action_items: [
        { description: 'Step 1', status: 'completed' },
        { description: 'Step 2', status: 'completed' },
      ],
    });
    render(<PlanStatusBadge plan={plan} agentMode="agent" />);
    expect(screen.getByTestId('agentBuilderPlanStatusBadge')).toHaveTextContent('Completed');
  });
});
