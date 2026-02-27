/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiProgress,
  EuiSpacer,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Plan, AgentMode } from '@kbn/agent-builder-common';
import { PlanStatusBadge } from './plan_status_badge';
import { PlanActionItemDisplay } from './plan_action_item_display';

const EXPANDED_MAX_HEIGHT = 280;

const panelTitle = i18n.translate('xpack.agentBuilder.planPanel.title', {
  defaultMessage: 'Plan',
});

const agentPlanTitle = i18n.translate('xpack.agentBuilder.planPanel.agentTitle', {
  defaultMessage: "Agent's Plan",
});

const approveButtonLabel = i18n.translate('xpack.agentBuilder.planPanel.approveAndExecute', {
  defaultMessage: 'Approve & Execute',
});

const collapseLabel = i18n.translate('xpack.agentBuilder.planPanel.collapse', {
  defaultMessage: 'Collapse plan panel',
});

const expandLabel = i18n.translate('xpack.agentBuilder.planPanel.expand', {
  defaultMessage: 'Expand plan panel',
});

interface PlanPanelProps {
  plan: Plan;
  agentMode: AgentMode;
  onApproveAndExecute: () => void;
  onItemClick?: (index: number, description: string) => void;
  isExecuting?: boolean;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
  plan,
  agentMode,
  onApproveAndExecute,
  onItemClick,
  isExecuting = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const { completedCount, inProgressCount, totalCount, progressPercent } = useMemo(() => {
    const total = plan.action_items.length;
    const completed = plan.action_items.filter((item) => item.status === 'completed').length;
    const inProgress = plan.action_items.filter((item) => item.status === 'in_progress').length;
    const progressValue = completed + inProgress * 0.5;
    const percent = total > 0 ? Math.round((progressValue / total) * 100) : 0;
    return {
      completedCount: completed,
      inProgressCount: inProgress,
      totalCount: total,
      progressPercent: percent,
    };
  }, [plan.action_items]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const allCompleted =
    plan.action_items.length > 0 && plan.action_items.every((item) => item.status === 'completed');

  const showApproveButton =
    plan.source === 'planning' && plan.status !== 'ready' && !isExecuting && !allCompleted;

  const title = plan.source === 'agent' ? agentPlanTitle : plan.title || panelTitle;

  const panelStyles = css`
    width: 100%;
    border-radius: ${euiTheme.border.radius.medium};
    overflow: hidden;
  `;

  const headerStyles = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    cursor: pointer;
    user-select: none;

    &:hover {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const progressBarStyles = css`
    margin-top: ${euiTheme.size.xs};
  `;

  const bodyStyles = css`
    max-height: ${EXPANDED_MAX_HEIGHT}px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-top: ${euiTheme.border.thin};
  `;

  const footerStyles = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    border-top: ${euiTheme.border.thin};
  `;

  return (
    <EuiPanel
      paddingSize="none"
      css={panelStyles}
      data-test-subj={isExpanded ? 'agentBuilderPlanPanel' : 'agentBuilderPlanPanelCollapsed'}
    >
      <div
        css={headerStyles}
        onClick={handleToggleExpand}
        data-test-subj="agentBuilderPlanPanelHeader"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isExpanded ? 'arrowDown' : 'arrowRight'}
              aria-label={isExpanded ? collapseLabel : expandLabel}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                handleToggleExpand();
              }}
              size="xs"
              data-test-subj={
                isExpanded ? 'agentBuilderPlanPanelCollapse' : 'agentBuilderPlanPanelExpand'
              }
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs">
              <strong>{title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {inProgressCount > 0
                ? `${completedCount}/${totalCount} (${inProgressCount} active)`
                : `${completedCount}/${totalCount}`}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PlanStatusBadge plan={plan} agentMode={agentMode} isExecuting={isExecuting} />
          </EuiFlexItem>
        </EuiFlexGroup>
        <div css={progressBarStyles}>
          <EuiProgress
            value={progressPercent}
            max={100}
            size="xs"
            color={progressPercent === 100 ? 'success' : 'primary'}
            data-test-subj="agentBuilderPlanProgress"
          />
        </div>
      </div>

      {isExpanded && (
        <>
          <div css={bodyStyles}>
            {plan.description && (
              <>
                <EuiText size="xs" color="subdued">
                  <p>{plan.description}</p>
                </EuiText>
                <EuiSpacer size="xs" />
              </>
            )}

            <EuiFlexGroup direction="column" gutterSize="xs">
              {plan.action_items.map((item, index) => (
                <EuiFlexItem key={index}>
                  <PlanActionItemDisplay item={item} index={index} onClick={onItemClick} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </div>

          {showApproveButton && (
            <div css={footerStyles}>
              <EuiButton
                fill
                fullWidth
                size="s"
                onClick={onApproveAndExecute}
                data-test-subj="agentBuilderPlanApproveButton"
              >
                {approveButtonLabel}
              </EuiButton>
            </div>
          )}
        </>
      )}
    </EuiPanel>
  );
};
