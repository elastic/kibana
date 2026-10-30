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
  EuiProgress,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SubscriptionStatus,
  SubscriptionStatusAction,
  SubscriptionStatusActionId,
} from '../status/types';

const popoverContentStyles = css({ width: 360 });

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
  const [isOpen, setIsOpen] = useState(false);
  const {
    label,
    badgeColor = 'primary',
    title,
    subtitle,
    meter,
    description,
    primaryAction,
    primaryActionStyle = 'fill',
    secondaryAction,
  } = status;

  const toggle = () => {
    if (!isOpen) onOpen();
    setIsOpen(!isOpen);
  };

  const getActionProps = ({ id, href, external }: SubscriptionStatusAction) => ({
    href,
    target: external ? '_blank' : undefined,
    onClick: () => {
      onAction(id);
      setIsOpen(false);
    },
  });

  return (
    <EuiPopover
      button={
        <EuiBadge
          color={badgeColor}
          fill={badgeColor === 'primary'}
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
        {title && (
          <>
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
          </>
        )}
        {meter && (
          <div data-test-subj="subscriptionStatusMeter">
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="baseline"
              gutterSize="m"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{meter.label}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color={meter.urgent ? 'warning' : undefined}>
                  {meter.value}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiProgress
              value={meter.percent}
              max={100}
              size="m"
              color={meter.urgent ? 'warning' : 'primary'}
              aria-label={`${meter.label}, ${meter.value}`}
            />
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued">
              {meter.detail}
            </EuiText>
          </div>
        )}
        {description && <EuiText size="s">{description}</EuiText>}
        <EuiSpacer size="l" />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          {secondaryAction && (
            <EuiFlexItem grow={false}>
              <EuiLink
                {...getActionProps(secondaryAction)}
                data-test-subj="subscriptionStatusSecondaryAction"
              >
                {secondaryAction.label}
              </EuiLink>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={!secondaryAction}>
            <EuiButton
              {...getActionProps(primaryAction)}
              fill={primaryActionStyle === 'fill'}
              fullWidth={!secondaryAction}
              size="s"
              iconType={
                primaryAction.external && primaryActionStyle === 'tinted' ? 'external' : undefined
              }
              iconSide="right"
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
            color="primary"
            fill
            tabIndex={0}
            // EuiBadge falls back to its inner text as a native title, which would duplicate the tooltip.
            title=""
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
