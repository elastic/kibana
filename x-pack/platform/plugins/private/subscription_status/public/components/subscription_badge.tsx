/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SubscriptionStatus, SubscriptionStatusActionId } from '../status/types';

const popoverContentStyles = css({ width: 320 });

export interface SubscriptionBadgeProps {
  status: SubscriptionStatus;
  onOpen: () => void;
  onAction: (id: SubscriptionStatusActionId) => void;
}

type PopoverStatus = Extract<SubscriptionStatus, { kind: 'popover' }>;

const SubscriptionPopover = ({
  status,
  onOpen,
  onAction,
}: Omit<SubscriptionBadgeProps, 'status'> & { status: PopoverStatus }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { label, title, subtitle, description, primaryAction, secondaryAction } = status;

  const toggle = () => {
    if (!isOpen) onOpen();
    setIsOpen(!isOpen);
  };

  const handleAction = (id: SubscriptionStatusActionId) => {
    onAction(id);
    setIsOpen(false);
  };

  return (
    <EuiPopover
      button={
        <EuiBadge
          color={euiTheme.colors.primary}
          onClick={toggle}
          onClickAriaLabel={i18n.translate('xpack.subscriptionStatus.badge.toggleAriaLabel', {
            defaultMessage: '{label}, show subscription details',
            values: { label },
          })}
          iconType="chevronSingleDown"
          iconSide="right"
          data-test-subj="subscriptionStatusBadge"
        >
          {label}
        </EuiBadge>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      hasArrow={false}
      aria-label={i18n.translate('xpack.subscriptionStatus.badge.popoverAriaLabel', {
        defaultMessage: 'Subscription details',
      })}
      panelProps={{ 'data-test-subj': 'subscriptionStatusPopover' }}
    >
      <div css={popoverContentStyles}>
        <EuiFlexGroup gutterSize="s" alignItems="baseline" wrap responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h4>{title}</h4>
            </EuiTitle>
          </EuiFlexItem>
          {subtitle && (
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                {subtitle}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s">{description}</EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {secondaryAction && (
              <EuiLink
                href={secondaryAction.href}
                target="_blank"
                onClick={() => handleAction(secondaryAction.id)}
                data-test-subj="subscriptionStatusSecondaryAction"
              >
                {secondaryAction.label}
              </EuiLink>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              href={primaryAction.href}
              target="_blank"
              fill
              size="s"
              onClick={() => handleAction(primaryAction.id)}
              data-test-subj="subscriptionStatusPrimaryAction"
            >
              {primaryAction.label}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

export const SubscriptionBadge = ({ status, onOpen, onAction }: SubscriptionBadgeProps) => {
  const { euiTheme } = useEuiTheme();

  switch (status.kind) {
    case 'popover':
      return <SubscriptionPopover status={status} onOpen={onOpen} onAction={onAction} />;
    case 'tooltip':
      return (
        // The tooltip is only linked to the badge while visible, so the message is also rendered as
        // hidden text for screen readers in browse mode.
        <EuiToolTip
          content={status.tooltip}
          disableScreenReaderOutput
          data-test-subj="subscriptionStatusTooltip"
        >
          <EuiBadge
            color={euiTheme.colors.primary}
            tabIndex={0}
            title={status.label}
            data-test-subj="subscriptionStatusBadge"
          >
            {status.label}
            <EuiScreenReaderOnly>
              <span>{status.tooltip}</span>
            </EuiScreenReaderOnly>
          </EuiBadge>
        </EuiToolTip>
      );
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
};
