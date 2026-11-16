/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type ReactElement, type ReactNode } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiToolTip,
  useEuiTheme,
  type EuiButtonColor,
} from '@elastic/eui';
import type { ApprovalAction } from './types';

interface ApprovalContentFooterProps {
  secondaryActions?: ApprovalAction[];
  primaryAction?: ApprovalAction;
  defaultButtonColor: EuiButtonColor;
  onPrimaryClick: (action: ApprovalAction) => void;
}

/**
 * Disabled buttons do not receive pointer events, so the tooltip wraps a span.
 */
const withDisabledReasonTooltip = (
  disabledReason: ReactNode | undefined,
  control: ReactElement
): ReactNode => {
  if (disabledReason == null) {
    return control;
  }
  return (
    <EuiToolTip content={disabledReason} position="top">
      {/*
        Disabled controls do not receive pointer/keyboard events, so the
        tooltip anchors on a focusable wrapper (EUI a11y requirement).
      */}
      <span
        tabIndex={0}
        css={css`
          display: inline-block;
        `}
      >
        {control}
      </span>
    </EuiToolTip>
  );
};

/**
 * The Approve/Decline row. Rendered only while a decision is still pending: `ApprovalContent`
 * itself decides whether to mount this at all — a decided or transient state names its actor in
 * the outcome banner instead, so there is nothing left here to show.
 */
export const ApprovalContentFooter = memo<ApprovalContentFooterProps>(
  ({ secondaryActions, primaryAction, defaultButtonColor, onPrimaryClick }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <div
        css={css({
          display: 'flex',
          gap: euiTheme.size.s,
          justifyContent: 'flex-end',
          padding: `0 ${euiTheme.size.base} ${euiTheme.size.base}`,
        })}
      >
        {/* Secondaries first so the decision that commits something sits rightmost. */}
        {secondaryActions?.map((action, i) => (
          <React.Fragment key={i}>
            {withDisabledReasonTooltip(
              action.isDisabled ? action.disabledReason : undefined,
              <EuiButtonEmpty
                size="s"
                color={action.color ?? 'primary'}
                iconType={action.iconType}
                isDisabled={action.isDisabled}
                isLoading={action.isLoading}
                onClick={action.onClick}
                data-test-subj={action['data-test-subj']}
              >
                {action.label}
              </EuiButtonEmpty>
            )}
          </React.Fragment>
        ))}
        {primaryAction &&
          withDisabledReasonTooltip(
            primaryAction.isDisabled ? primaryAction.disabledReason : undefined,
            <EuiButton
              fill={primaryAction.fill ?? true}
              size="s"
              color={primaryAction.color ?? defaultButtonColor}
              iconType={primaryAction.iconType ?? 'play'}
              isDisabled={primaryAction.isDisabled}
              isLoading={primaryAction.isLoading}
              onClick={() => onPrimaryClick(primaryAction)}
              data-test-subj={primaryAction['data-test-subj']}
            >
              {primaryAction.label}
            </EuiButton>
          )}
      </div>
    );
  }
);

ApprovalContentFooter.displayName = 'ApprovalContentFooter';
