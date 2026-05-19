/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconColor, IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TodoItem, TodoStatus, TodosStep } from '@kbn/agent-builder-common/chat/conversation';

interface TodosStepDisplayProps {
  step: TodosStep;
}

interface TodoStatusDisplay {
  iconType: IconType;
  iconColor: IconColor;
  label: string;
  isInactive: boolean;
}

// Single source of truth for how each todo status renders.
// Add/adjust a status here and both the icon and the line-through styling follow.
const TODO_STATUS_DISPLAY: Record<TodoStatus, TodoStatusDisplay> = {
  pending: {
    iconType: 'dashedCircle',
    iconColor: 'subdued',
    isInactive: false,
    label: i18n.translate('xpack.agentBuilder.conversation.todos.statusPending', {
      defaultMessage: 'Pending',
    }),
  },
  in_progress: {
    iconType: 'dotInCircle',
    iconColor: 'primary',
    isInactive: false,
    label: i18n.translate('xpack.agentBuilder.conversation.todos.statusInProgress', {
      defaultMessage: 'In progress',
    }),
  },
  completed: {
    iconType: 'checkInCircleFilled',
    iconColor: 'success',
    isInactive: true,
    label: i18n.translate('xpack.agentBuilder.conversation.todos.statusCompleted', {
      defaultMessage: 'Completed',
    }),
  },
  cancelled: {
    iconType: 'crossCircle',
    iconColor: 'subdued',
    isInactive: true,
    label: i18n.translate('xpack.agentBuilder.conversation.todos.statusCancelled', {
      defaultMessage: 'Cancelled',
    }),
  },
};

const isActive = (todo: TodoItem) => !TODO_STATUS_DISPLAY[todo.status].isInactive;

const expandIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const TodosStepDisplay: React.FC<TodosStepDisplayProps> = ({ step }) => {
  const { euiTheme } = useEuiTheme();
  const { todos, carried_over: isCarriedOver } = step;

  if (!todos.length) return null;

  const activeCount = todos.filter(isActive).length;

  const containerStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    border-radius: ${euiTheme.border.radius.medium};
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
  `;

  const headerTextStyles = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  const itemsStyles = css`
    animation: ${expandIn} ${euiTheme.animation.normal} ease-out;
    margin-top: ${euiTheme.size.s};
  `;

  const itemInactiveStyles = css`
    text-decoration: line-through;
    color: ${euiTheme.colors.textSubdued};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="none" css={containerStyles}>
      {/* Header — always visible */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" size="s" color="subdued" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" css={headerTextStyles}>
              <strong>
                {i18n.translate('xpack.agentBuilder.conversation.todos.header', {
                  defaultMessage: 'To-dos {count}',
                  values: { count: activeCount },
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {/* Items — only shown when todos were written this round (not just carried over) */}
      {!isCarriedOver && (
        <EuiFlexGroup direction="column" gutterSize="s" css={itemsStyles} responsive={false}>
          {todos.map((todo, index) => {
            const display = TODO_STATUS_DISPLAY[todo.status];
            return (
              <EuiFlexItem key={index} grow={false}>
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={display.iconType}
                      size="s"
                      color={display.iconColor}
                      aria-label={display.label}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" css={display.isInactive ? itemInactiveStyles : undefined}>
                      {todo.content}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};
