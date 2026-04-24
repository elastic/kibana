/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { TodoItem, TodoPriority } from '@kbn/agent-builder-common/chat/conversation';

const PRIORITY_ORDER: TodoPriority[] = ['high', 'medium', 'low'];

const priorityLabel = (priority: TodoPriority) => {
  if (priority === 'high') {
    return i18n.translate('xpack.agentBuilder.todoPanel.priority.high', {
      defaultMessage: 'High',
    });
  }
  if (priority === 'medium') {
    return i18n.translate('xpack.agentBuilder.todoPanel.priority.medium', {
      defaultMessage: 'Medium',
    });
  }
  return i18n.translate('xpack.agentBuilder.todoPanel.priority.low', {
    defaultMessage: 'Low',
  });
};

const statusIcon = (status: TodoItem['status']): string => {
  if (status === 'completed') return '✓';
  if (status === 'in_progress') return '◐';
  if (status === 'cancelled') return '✕';
  return '○';
};

interface TodoItemRowProps {
  item: TodoItem;
}

const TodoItemRow: React.FC<TodoItemRowProps> = ({ item }) => {
  const { euiTheme } = useEuiTheme();
  const isDone = item.status === 'completed' || item.status === 'cancelled';

  const rowStyles = css`
    opacity: ${isDone ? 0.5 : 1};
    text-decoration: ${item.status === 'cancelled' ? 'line-through' : 'none'};
  `;

  const iconStyles = css`
    min-width: ${euiTheme.size.base};
    color: ${
      item.status === 'completed'
        ? euiTheme.colors.success
        : item.status === 'in_progress'
          ? euiTheme.colors.primary
          : euiTheme.colors.subduedText
    };
    font-size: ${euiTheme.size.m};
  `;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" css={rowStyles} responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" css={iconStyles}>
          <span>{statusIcon(item.status)}</span>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">{item.content}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface TodoPanelProps {
  todos: TodoItem[];
}

export const TodoPanel: React.FC<TodoPanelProps> = ({ todos }) => {
  if (todos.length === 0) return null;

  const grouped = PRIORITY_ORDER.reduce<Record<TodoPriority, TodoItem[]>>(
    (acc, p) => {
      acc[p] = todos.filter((t) => t.priority === p);
      return acc;
    },
    { high: [], medium: [], low: [] }
  );

  return (
    <>
      <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
        <EuiTitle size="xxxs">
          <h3>
            {i18n.translate('xpack.agentBuilder.todoPanel.title', {
              defaultMessage: 'Plan',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="xs">
          {PRIORITY_ORDER.filter((p) => grouped[p].length > 0).map((priority) => (
            <EuiFlexItem key={priority}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'default'}>
                    {priorityLabel(priority)}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiFlexGroup direction="column" gutterSize="xs">
                {grouped[priority].map((item, idx) => (
                  <EuiFlexItem key={idx}>
                    <TodoItemRow item={item} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
