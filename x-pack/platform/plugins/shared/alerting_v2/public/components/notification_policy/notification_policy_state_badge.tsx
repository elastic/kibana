/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

interface NotificationPolicyStateBadgeProps {
  policy: NotificationPolicyResponse;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  isLoading: boolean;
}

export const NotificationPolicyStateBadge = ({
  policy,
  onEnable,
  onDisable,
  isLoading,
}: NotificationPolicyStateBadgeProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  const trailingIcon = isLoading ? (
    <EuiLoadingSpinner size="s" />
  ) : (
    <EuiIcon type="arrowDown" size="s" />
  );

  const badge = (
    <EuiBadge
      color={policy.enabled ? 'success' : 'default'}
      onClick={togglePopover}
      onClickAriaLabel={i18n.translate(
        policy.enabled
          ? 'xpack.alertingV2.notificationPolicy.stateBadge.enabledAriaLabel'
          : 'xpack.alertingV2.notificationPolicy.stateBadge.disabledAriaLabel',
        {
          defaultMessage: policy.enabled
            ? 'Enabled. Click to change state.'
            : 'Disabled. Click to change state.',
        }
      )}
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {policy.enabled
            ? i18n.translate('xpack.alertingV2.notificationPolicy.stateBadge.enabled', {
                defaultMessage: 'Enabled',
              })
            : i18n.translate('xpack.alertingV2.notificationPolicy.stateBadge.disabled', {
                defaultMessage: 'Disabled',
              })}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{trailingIcon}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );

  return (
    <EuiPopover
      button={badge}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
    >
      {policy.enabled ? (
        <EuiButtonEmpty
          size="s"
          color="text"
          isLoading={isLoading}
          onClick={() => {
            onDisable(policy.id);
            closePopover();
          }}
        >
          {i18n.translate('xpack.alertingV2.notificationPolicy.stateBadge.disableAction', {
            defaultMessage: 'Disable',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiButtonEmpty
          size="s"
          color="text"
          isLoading={isLoading}
          onClick={() => {
            onEnable(policy.id);
            closePopover();
          }}
        >
          {i18n.translate('xpack.alertingV2.notificationPolicy.stateBadge.enableAction', {
            defaultMessage: 'Enable',
          })}
        </EuiButtonEmpty>
      )}
    </EuiPopover>
  );
};
