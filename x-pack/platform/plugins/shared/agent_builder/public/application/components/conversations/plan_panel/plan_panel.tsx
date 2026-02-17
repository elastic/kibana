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
  EuiNotificationBadge,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Plan, AgentMode } from '@kbn/agent-builder-common';
import { PlanStatusBadge } from './plan_status_badge';
import { PlanActionItemDisplay } from './plan_action_item_display';

const PANEL_WIDTH = 340;

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { completedCount, totalCount, progressPercent } = useMemo(() => {
    const total = plan.action_items.length;
    const completed = plan.action_items.filter((item) => item.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completedCount: completed, totalCount: total, progressPercent: percent };
  }, [plan.action_items]);

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  const allCompleted =
    plan.action_items.length > 0 &&
    plan.action_items.every((item) => item.status === 'completed');

  const showApproveButton =
    plan.source === 'planning' && plan.status !== 'ready' && !isExecuting && !allCompleted;

  const panelStyles = css`
    width: ${isCollapsed ? 'auto' : `${PANEL_WIDTH}px`};
    min-width: ${isCollapsed ? 'auto' : `${PANEL_WIDTH}px`};
    max-height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: width 200ms ease-out;
  `;

  const headerStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-bottom: ${euiTheme.border.thin};
    flex-shrink: 0;
  `;

  const titleStyles = css`
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  `;

  const bodyStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
  `;

  const footerStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-top: ${euiTheme.border.thin};
    flex-shrink: 0;
  `;

  if (isCollapsed) {
    return (
      <EuiPanel paddingSize="s" css={panelStyles} data-test-subj="agentBuilderPlanPanelCollapsed">
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="arrowStart"
              aria-label={expandLabel}
              onClick={handleToggleCollapse}
              size="s"
              data-test-subj="agentBuilderPlanPanelExpand"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiNotificationBadge color={progressPercent === 100 ? 'success' : 'accent'}>
              {completedCount}/{totalCount}
            </EuiNotificationBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="none" css={panelStyles} data-test-subj="agentBuilderPlanPanel">
      <div css={headerStyles}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
              <EuiFlexItem>
                <EuiText size="s" css={titleStyles}>
                  <strong>
                    {plan.source === 'agent' ? agentPlanTitle : plan.title || panelTitle}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <PlanStatusBadge plan={plan} agentMode={agentMode} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="arrowEnd"
              aria-label={collapseLabel}
              onClick={handleToggleCollapse}
              size="s"
              data-test-subj="agentBuilderPlanPanelCollapse"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiProgress
          value={progressPercent}
          max={100}
          size="s"
          color={progressPercent === 100 ? 'success' : 'primary'}
          data-test-subj="agentBuilderPlanProgress"
        />
      </div>

      <div css={bodyStyles}>
        {plan.description && (
          <>
            <EuiText size="xs" color="subdued">
              <p>{plan.description}</p>
            </EuiText>
            <EuiSpacer size="s" />
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
    </EuiPanel>
  );
};
