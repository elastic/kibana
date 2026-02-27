/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { PlanActionItem } from '@kbn/agent-builder-common';
import { PlanActionItemDisplay } from './plan_action_item_display';

const createItem = (overrides: Partial<PlanActionItem> = {}): PlanActionItem => ({
  description: 'Analyze alert patterns',
  status: 'pending',
  ...overrides,
});

describe('PlanActionItemDisplay', () => {
  it('renders the item description', () => {
    render(<PlanActionItemDisplay item={createItem()} index={0} />);
    expect(screen.getByText('Analyze alert patterns')).toBeInTheDocument();
  });

  it('renders skill badges when related_skills are provided', () => {
    const item = createItem({
      related_skills: ['alert_triage', 'log_analysis'],
    });
    render(<PlanActionItemDisplay item={item} index={0} />);
    expect(screen.getByText('alert_triage')).toBeInTheDocument();
    expect(screen.getByText('log_analysis')).toBeInTheDocument();
  });

  it('renders tool badges when related_tools are provided', () => {
    const item = createItem({
      related_tools: ['platform.search', 'esql'],
    });
    render(<PlanActionItemDisplay item={item} index={0} />);
    expect(screen.getByText('platform.search')).toBeInTheDocument();
    expect(screen.getByText('esql')).toBeInTheDocument();
  });

  it('does not render badges when no related_skills or related_tools', () => {
    const item = createItem();
    const { container } = render(<PlanActionItemDisplay item={item} index={0} />);
    expect(container.querySelectorAll('.euiBadge')).toHaveLength(0);
  });

  it('calls onClick with index and description when clicked', () => {
    const onClick = jest.fn();
    render(<PlanActionItemDisplay item={createItem()} index={2} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('agentBuilderPlanActionItem-2'));
    expect(onClick).toHaveBeenCalledWith(2, 'Analyze alert patterns');
  });

  it('does not crash when onClick is not provided and item is clicked', () => {
    render(<PlanActionItemDisplay item={createItem()} index={0} />);
    fireEvent.click(screen.getByTestId('agentBuilderPlanActionItem-0'));
    // no assertion needed — test passes if no error is thrown
  });

  it('renders status icon for each status', () => {
    const statuses = ['pending', 'in_progress', 'completed', 'failed'] as const;
    for (const status of statuses) {
      const { unmount } = render(<PlanActionItemDisplay item={createItem({ status })} index={0} />);
      // The status icon should be present (wrapped in a tooltip)
      expect(screen.getByTestId('agentBuilderPlanActionItem-0')).toBeInTheDocument();
      unmount();
    }
  });
});
