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
  /** Top-level row content (the headline label) */
  label: ReactNode;
  /**
   * When provided, the row is clickable to toggle expansion.
   * Omit for steps without sub-fields (reasoning, compaction) — those steps
   * are static rows.
   */
  onClick?: () => void;
  /** Controlled expansion state — only meaningful when onClick is provided */
  isExpanded?: boolean;
  /** Sub-field content shown indented when isExpanded is true */
  expansion?: ReactNode;
  /**
   * EBT click-telemetry action for the row's expand/collapse click. Required
   * when `onClick` is provided so every clickable step row reports an event;
   * caller passes the appropriate step-type action (e.g.
   * `EXPAND_TOOL_CALL_STEP`).
   */
  ebtAction?: ConversationAction;
}

/**
 * Shared layout for a single step row in the events block.
 *
 * Replaces the old `ThinkingItemLayout` with a smaller surface:
 *  - No icon column (no status icons / loading spinners / checkmarks).
 *  - No `textColor` / `isLoading` props.
 *  - Optional click handler turns the row into an expandable disclosure with
 *    a chevron, indenting the expansion content underneath.
 */
export const StepLayout: React.FC<StepLayoutProps> = ({
  label,
  onClick,
  isExpanded = false,
  expansion,
  ebtAction,
}) => {
  const { euiTheme } = useEuiTheme();
  const isClickable = !!onClick;

  // Base text color for every step row:
  //   - collapsed / non-clickable → textDisabled
  //   - expanded                   → textParagraph (stays "active" while open)
  //   - hover (clickable only)     → textParagraph
  //
  // Steps that need to break out of this (e.g. a tool call whose result is an
  // error) do so by setting `color="danger"` on the EuiText inside their
  // `label` prop — that overrides the inherited color from this wrapper.
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
        {/* grow={false} so the chevron sits next to the label (8px gap via gutterSize="s")
            instead of being pushed to the far right by the label's flex stretch. */}
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
