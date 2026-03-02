/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Plan, AgentMode } from '@kbn/agent-builder-common';

const labels = {
  draft: i18n.translate('xpack.agentBuilder.planPanel.status.draft', {
    defaultMessage: 'Draft',
  }),
  ready: i18n.translate('xpack.agentBuilder.planPanel.status.ready', {
    defaultMessage: 'Ready',
  }),
  executing: i18n.translate('xpack.agentBuilder.planPanel.status.executing', {
    defaultMessage: 'Executing',
  }),
  completed: i18n.translate('xpack.agentBuilder.planPanel.status.completed', {
    defaultMessage: 'Completed',
  }),
  inProgress: i18n.translate('xpack.agentBuilder.planPanel.status.inProgress', {
    defaultMessage: 'In Progress',
  }),
};

interface PlanStatusBadgeProps {
  plan: Plan;
  agentMode: AgentMode;
  isExecuting?: boolean;
}

/**
 * Derives the visual display status from plan state and runtime context.
 * "Executing", "In Progress", and "Completed" are UI-only states — not stored in the plan.
 */
const deriveDisplayStatus = (
  plan: Plan,
  agentMode: AgentMode,
  isExecuting: boolean
): { label: string; color: string } => {
  const allCompleted =
    plan.action_items.length > 0 && plan.action_items.every((item) => item.status === 'completed');
  const hasAnyProgress = plan.action_items.some(
    (item) => item.status === 'completed' || item.status === 'in_progress'
  );

  if (allCompleted) {
    return { label: labels.completed, color: 'success' };
  }

  // Runtime execution state takes priority — the server may still report
  // 'draft' while the agent is actively working through the plan.
  if (isExecuting && agentMode === 'agent') {
    return { label: labels.executing, color: 'accent' };
  }

  if (agentMode === 'agent' && hasAnyProgress) {
    return { label: labels.inProgress, color: 'primary' };
  }

  if (plan.status === 'draft') {
    return { label: labels.draft, color: 'warning' };
  }

  if (plan.status === 'ready' && agentMode === 'planning') {
    return { label: labels.ready, color: 'primary' };
  }

  return { label: labels.ready, color: 'primary' };
};

export const PlanStatusBadge: React.FC<PlanStatusBadgeProps> = ({
  plan,
  agentMode,
  isExecuting = false,
}) => {
  const { label, color } = deriveDisplayStatus(plan, agentMode, isExecuting);

  return (
    <EuiBadge color={color} data-test-subj="agentBuilderPlanStatusBadge">
      {label}
    </EuiBadge>
  );
};
