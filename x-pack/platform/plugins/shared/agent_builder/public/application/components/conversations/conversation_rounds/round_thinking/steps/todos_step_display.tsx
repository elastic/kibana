/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { TodoItem, TodosStep } from '@kbn/agent-builder-common/chat/conversation';

interface TodosStepDisplayProps {
  step: TodosStep;
}

const isActive = (todo: TodoItem) => todo.status !== 'completed' && todo.status !== 'cancelled';

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

  const itemCompletedStyles = css`
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
            const done = !isActive(todo);
            return (
              <EuiFlexItem key={index} grow={false}>
                <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    {done ? (
                      <EuiIcon type="checkInCircleFilled" size="s" color="success" />
                    ) : (
                      <EuiIcon type="plusInCircle" size="s" color="subdued" />
                    )}
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s" css={done ? itemCompletedStyles : undefined}>
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
