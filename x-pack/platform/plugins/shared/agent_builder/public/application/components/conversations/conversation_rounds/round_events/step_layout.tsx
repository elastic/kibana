/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';

type ConversationAction =
  (typeof AGENT_BUILDER_UI_EBT.action.conversation)[keyof typeof AGENT_BUILDER_UI_EBT.action.conversation];

interface StepLayoutProps {
  label: ReactNode;
  onClick?: () => void;
  isExpanded?: boolean;
  expansion?: ReactNode;
  ebtAction?: ConversationAction;
}

export const StepLayout: React.FC<StepLayoutProps> = ({
  label,
  onClick,
  isExpanded = false,
  expansion,
  ebtAction,
}) => {
  const { euiTheme } = useEuiTheme();
  const isClickable = !!onClick;

  const rowStyles = css`
    color: ${isExpanded ? euiTheme.colors.textParagraph : euiTheme.colors.textDisabled};
    ${isClickable
      ? `
        cursor: pointer;
        &:hover {
          color: ${euiTheme.colors.textParagraph};
        }
      `
      : ''}
  `;

  const expansionStyles = css`
    padding-top: ${euiTheme.size.s};
  `;

  return (
    <div>
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={rowStyles}
        onClick={isClickable ? onClick : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        {...(isClickable && ebtAction
          ? getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: ebtAction,
              detail: 'conversation',
            })
          : {})}
      >
        <EuiFlexItem grow={false}>{label}</EuiFlexItem>
        {isClickable && (
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={isExpanded ? 'arrowDown' : 'arrowRight'}
              color="subdued"
              size="s"
              aria-hidden={true}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {isClickable && isExpanded && expansion && <div css={expansionStyles}>{expansion}</div>}
    </div>
  );
};
