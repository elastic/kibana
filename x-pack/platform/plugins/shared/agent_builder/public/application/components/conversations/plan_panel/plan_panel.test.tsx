/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Plan } from '@kbn/agent-builder-common';
import { PlanPanel } from './plan_panel';

const createPlan = (overrides: Partial<Plan> = {}): Plan => ({
  title: 'Test Plan',
  description: 'A test plan description',
  action_items: [
    { description: 'Step 1', status: 'completed' },
    { description: 'Step 2', status: 'in_progress' },
    { description: 'Step 3', status: 'pending' },
  ],
  status: 'draft',
  source: 'planning',
  ...overrides,
});

describe('PlanPanel', () => {
  const defaultProps = {
    onApproveAndExecute: jest.fn(),
    onItemClick: jest.fn(),
    agentMode: 'planning' as const,
    isExecuting: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the plan title', () => {
    render(<PlanPanel plan={createPlan()} {...defaultProps} />);
    expect(screen.getByText('Test Plan')).toBeInTheDocument();
  });

  it('renders the plan description', () => {
    render(<PlanPanel plan={createPlan()} {...defaultProps} />);
    expect(screen.getByText('A test plan description')).toBeInTheDocument();
  });

  it('renders all action items', () => {
    render(<PlanPanel plan={createPlan()} {...defaultProps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    render(<PlanPanel plan={createPlan()} {...defaultProps} />);
    expect(screen.getByTestId('agentBuilderPlanProgress')).toBeInTheDocument();
  });

  it('shows "Approve & Execute" button for draft plans with planning source', () => {
    const plan = createPlan({ status: 'draft', source: 'planning' });
    render(<PlanPanel plan={plan} {...defaultProps} />);
    expect(screen.getByTestId('agentBuilderPlanApproveButton')).toBeInTheDocument();
  });

  it('hides "Approve & Execute" button for ready plans (already approved)', () => {
    const plan = createPlan({ status: 'ready', source: 'planning' });
    render(<PlanPanel plan={plan} {...defaultProps} />);
    expect(screen.queryByTestId('agentBuilderPlanApproveButton')).not.toBeInTheDocument();
  });

  it('hides "Approve & Execute" button for agent-sourced plans', () => {
    const plan = createPlan({ status: 'draft', source: 'agent' });
    render(<PlanPanel plan={plan} {...defaultProps} />);
    expect(screen.queryByTestId('agentBuilderPlanApproveButton')).not.toBeInTheDocument();
  });

  it('hides "Approve & Execute" button when executing', () => {
    const plan = createPlan({ status: 'draft', source: 'planning' });
    render(<PlanPanel plan={plan} {...defaultProps} isExecuting />);
    expect(screen.queryByTestId('agentBuilderPlanApproveButton')).not.toBeInTheDocument();
  });

  it('hides "Approve & Execute" button when all items are completed', () => {
    const plan = createPlan({
      status: 'draft',
      source: 'planning',
      action_items: [
        { description: 'Step 1', status: 'completed' },
        { description: 'Step 2', status: 'completed' },
      ],
    });
    render(<PlanPanel plan={plan} {...defaultProps} />);
    expect(screen.queryByTestId('agentBuilderPlanApproveButton')).not.toBeInTheDocument();
  });

  it('calls onApproveAndExecute when button is clicked', () => {
    const plan = createPlan({ status: 'draft', source: 'planning' });
    render(<PlanPanel plan={plan} {...defaultProps} />);
    fireEvent.click(screen.getByTestId('agentBuilderPlanApproveButton'));
    expect(defaultProps.onApproveAndExecute).toHaveBeenCalledTimes(1);
  });

  it('shows "Agent\'s Plan" header for agent-sourced plans', () => {
    const plan = createPlan({ source: 'agent' });
    render(<PlanPanel plan={plan} {...defaultProps} />);
    expect(screen.getByText("Agent's Plan")).toBeInTheDocument();
  });

  it('collapses panel when collapse button is clicked', () => {
    render(<PlanPanel plan={createPlan()} {...defaultProps} />);
    const collapseButton = screen.getByTestId('agentBuilderPlanPanelCollapse');
    fireEvent.click(collapseButton);
    expect(screen.getByTestId('agentBuilderPlanPanelCollapsed')).toBeInTheDocument();
  });

  it('shows progress badge when collapsed', () => {
    render(<PlanPanel plan={createPlan()} {...defaultProps} />);
    fireEvent.click(screen.getByTestId('agentBuilderPlanPanelCollapse'));
    // After collapsing, the progress badge (1/3) should be visible
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('expands panel when expand button is clicked in collapsed state', () => {
    render(<PlanPanel plan={createPlan()} {...defaultProps} />);
    // Collapse first
    fireEvent.click(screen.getByTestId('agentBuilderPlanPanelCollapse'));
    expect(screen.getByTestId('agentBuilderPlanPanelCollapsed')).toBeInTheDocument();
    // Expand
    fireEvent.click(screen.getByTestId('agentBuilderPlanPanelExpand'));
    expect(screen.getByTestId('agentBuilderPlanPanel')).toBeInTheDocument();
  });
});
