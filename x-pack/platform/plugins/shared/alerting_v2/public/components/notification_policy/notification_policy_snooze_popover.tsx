/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonIcon, EuiPopover, EuiToolTip } from '@elastic/eui';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { isSnoozed } from './is_snoozed';
import {
  NotificationPolicySnoozeForm,
  formatSnoozeDate,
  formatSnoozeFullDate,
} from './notification_policy_snooze_form';

interface NotificationPolicySnoozePopoverProps {
  policy: NotificationPolicyResponse;
  onSnooze: (id: string, snoozedUntil: string) => void;
  onCancelSnooze: (id: string) => void;
  isLoading: boolean;
}

export const NotificationPolicySnoozePopover = ({
  policy,
  onSnooze,
  onCancelSnooze,
  isLoading,
}: NotificationPolicySnoozePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const snoozed = isSnoozed(policy.snoozedUntil);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  const triggerButton = snoozed ? (
    <EuiToolTip
      content={i18n.translate('xpack.alertingV2.notificationPolicy.snooze.snoozedUntilTooltip', {
        defaultMessage: 'Snoozed until {date}',
        values: { date: formatSnoozeFullDate(policy.snoozedUntil!) },
      })}
    >
      <EuiButton
        iconType="bellSlash"
        color="accent"
        size="xs"
        onClick={togglePopover}
        isLoading={isLoading}
      >
        {formatSnoozeDate(policy.snoozedUntil!)}
      </EuiButton>
    </EuiToolTip>
  ) : (
    <EuiButtonIcon
      iconType="bell"
      aria-label={i18n.translate('xpack.alertingV2.notificationPolicy.snooze.ariaLabel', {
        defaultMessage: 'Snooze notification policy',
      })}
      onClick={togglePopover}
      isLoading={isLoading}
    />
  );

  return (
    <EuiPopover
      button={triggerButton}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="downLeft"
      panelPaddingSize="m"
      panelStyle={{ width: 320 }}
    >
      <NotificationPolicySnoozeForm
        isSnoozed={snoozed}
        onApplySnooze={(snoozedUntil) => {
          onSnooze(policy.id, snoozedUntil);
          closePopover();
        }}
        onCancelSnooze={() => {
          onCancelSnooze(policy.id);
          closePopover();
        }}
      />
    </EuiPopover>
  );
};
