/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ActionPolicySnoozeModal } from './action_policy_snooze_modal';
import { formatSnoozeDate, formatSnoozeFullDate } from './format_snooze_date';
import { isSnoozed } from './is_snoozed';

interface ActionPolicySnoozeButtonProps {
  policy: ActionPolicyResponse;
  onSnooze: (id: string, snoozedUntil: string) => void;
  onCancelSnooze: (id: string) => void;
  isLoading: boolean;
  isDisabled?: boolean;
}

const SNOOZE_ARIA_LABEL = i18n.translate('xpack.alertingV2.actionPolicy.snooze.ariaLabel', {
  defaultMessage: 'Snooze action policy',
});

/**
 * Bell affordance for the action policy snooze state: opens the snooze modal
 * when the policy is active, and unsnoozes it on click when it is snoozed.
 */
export const ActionPolicySnoozeButton = ({
  policy,
  onSnooze,
  onCancelSnooze,
  isLoading,
  isDisabled = false,
}: ActionPolicySnoozeButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { snoozed_until: snoozedUntil } = policy;

  if (isSnoozed(snoozedUntil)) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.alertingV2.actionPolicy.snooze.snoozedUntilTooltip', {
          defaultMessage: 'Snoozed until {date}. Click to unsnooze.',
          values: { date: formatSnoozeFullDate(snoozedUntil) },
        })}
      >
        <EuiButtonEmpty
          iconType="bellSlash"
          color="accent"
          size="xs"
          onClick={() => onCancelSnooze(policy.id)}
          isLoading={isLoading}
          isDisabled={isDisabled}
          data-test-subj="actionPolicyUnsnoozeButton"
        >
          {formatSnoozeDate(snoozedUntil)}
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }

  return (
    <>
      <EuiToolTip content={SNOOZE_ARIA_LABEL} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="bell"
          color="text"
          aria-label={SNOOZE_ARIA_LABEL}
          onClick={() => setIsModalOpen(true)}
          isLoading={isLoading}
          isDisabled={isDisabled}
          data-test-subj="actionPolicySnoozeButton"
        />
      </EuiToolTip>
      {isModalOpen && (
        <ActionPolicySnoozeModal
          onApplySnooze={(nextSnoozedUntil) => {
            onSnooze(policy.id, nextSnoozedUntil);
            setIsModalOpen(false);
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};
