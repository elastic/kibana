/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, type ReactElement } from 'react';
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

const getPermissionTooltipForAction = (action?: ApprovalAction): string | undefined =>
  action?.isDisabled && action?.disabledReason ? action.disabledReason : undefined;

const withPermissionTooltip = (button: ReactElement, tooltip?: string): ReactElement =>
  tooltip ? (
    <EuiToolTip content={tooltip} position="top">
      {button}
    </EuiToolTip>
  ) : (
    button
  );

/**
 * The Approve/Decline row. Rendered only while a decision is still pending: `ApprovalContent`
 * itself decides whether to mount this at all — a decided or transient state names its actor in
 * the outcome banner instead, so there is nothing left here to show.
 */
export const ApprovalContentFooter = memo<ApprovalContentFooterProps>(
  ({ secondaryActions, primaryAction, defaultButtonColor, onPrimaryClick }) => {
    const { euiTheme } = useEuiTheme();
    const primaryPermissionTooltip = getPermissionTooltipForAction(primaryAction);

    const primaryButton = primaryAction ? (
      <EuiButton
        fill={primaryAction.fill ?? true}
        size="s"
        color={primaryAction.color ?? defaultButtonColor}
        iconType={primaryAction.iconType ?? 'play'}
        isDisabled={primaryAction.isDisabled}
        hasAriaDisabled={!!primaryPermissionTooltip}
        isLoading={primaryAction.isLoading}
        onClick={() => onPrimaryClick(primaryAction)}
        data-test-subj={primaryAction['data-test-subj']}
      >
        {primaryAction.label}
      </EuiButton>
    ) : null;

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
        {secondaryActions?.map((action, i) => {
          const permissionTooltip = getPermissionTooltipForAction(action);
          const button = (
            <EuiButtonEmpty
              size="s"
              color={action.color ?? 'primary'}
              iconType={action.iconType}
              isDisabled={action.isDisabled}
              hasAriaDisabled={!!permissionTooltip}
              isLoading={action.isLoading}
              onClick={action.onClick}
              data-test-subj={action['data-test-subj']}
            >
              {action.label}
            </EuiButtonEmpty>
          );
          return (
            <React.Fragment key={i}>
              {withPermissionTooltip(button, permissionTooltip)}
            </React.Fragment>
          );
        })}
        {primaryButton && withPermissionTooltip(primaryButton, primaryPermissionTooltip)}
      </div>
    );
  }
);

ApprovalContentFooter.displayName = 'ApprovalContentFooter';
