/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { parseRuleCircuitBreakerErrorMessage } from '@kbn/alerting-plugin/common';
import type { EuiSwitchEvent } from '@elastic/eui';
import {
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  EuiSwitch,
} from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';
import { isRuleSnoozed } from '../../../lib';
import type { Rule, SnoozeSchedule, BulkOperationResponse } from '../../../../types';
import { ToastWithCircuitBreakerContent } from '../../../components/toast_with_circuit_breaker_content';
import { UntrackAlertsModal } from '../../common/components/untrack_alerts_modal';

const SNOOZE_END_TIME_FORMAT = 'LL @ LT';

type DropdownRuleRecord = Pick<
  Rule,
  'enabled' | 'muteAll' | 'isSnoozedUntil' | 'snoozeSchedule' | 'activeSnoozes'
> &
  Partial<Pick<Rule, 'ruleTypeId'>>;

export interface ComponentOpts {
  rule: DropdownRuleRecord;
  onRuleChanged: () => void;
  enableRule: () => Promise<BulkOperationResponse>;
  disableRule: (untrack: boolean) => Promise<BulkOperationResponse>;
  snoozeRule: (snoozeSchedule: SnoozeSchedule) => Promise<void>;
  unsnoozeRule: (scheduleIds?: string[]) => Promise<void>;
  isEditable: boolean;
  direction?: 'column' | 'row';
  hideSnoozeOption?: boolean;
  autoRecoverAlerts?: boolean;
}

export const RuleStatusDropdown: React.FunctionComponent<ComponentOpts> = ({
  rule,
  onRuleChanged,
  disableRule,
  enableRule,
  snoozeRule,
  unsnoozeRule,
  isEditable,
  hideSnoozeOption = false,
  direction = 'column',
  autoRecoverAlerts,
}: ComponentOpts) => {
  const {
    notifications: { toasts },
    i18n: i18nStart,
    theme,
    userProfile,
  } = useKibana().services;

  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isUntrackAlertsModalOpen, setIsUntrackAlertsModalOpen] = useState<boolean>(false);
  const isSnoozed = !hideSnoozeOption && isRuleSnoozed(rule);

  const enableRuleInternal = useCallback(async () => {
    const { errors } = await enableRule();

    if (!errors.length) {
      return;
    }

    const message = parseRuleCircuitBreakerErrorMessage(errors[0].message);
    toasts.addDanger({
      title: message.summary,
      ...(message.details && {
        text: toMountPoint(
          <ToastWithCircuitBreakerContent>{message.details}</ToastWithCircuitBreakerContent>,
          { i18n: i18nStart, theme, userProfile }
        ),
      }),
    });
    throw new Error();
  }, [i18nStart, theme, userProfile, enableRule, toasts]);

  const onEnable = useCallback(async () => {
    setIsUpdating(true);
    try {
      await enableRuleInternal();
      onRuleChanged();
    } finally {
      setIsUpdating(false);
    }
  }, [onRuleChanged, enableRuleInternal]);

  const onDisable = useCallback(
    async (untrack: boolean) => {
      setIsUpdating(true);
      try {
        await disableRule(untrack);
        onRuleChanged();
      } finally {
        setIsUpdating(false);
      }
    },
    [onRuleChanged, disableRule]
  );

  const onDisableModalOpen = useCallback(() => {
    setIsUntrackAlertsModalOpen(true);
  }, []);

  const onDisableModalClose = useCallback(() => {
    setIsUntrackAlertsModalOpen(false);
  }, []);

  const onModalConfirm = useCallback(
    (untrack: boolean) => {
      onDisableModalClose();
      onDisable(untrack);
    },
    [onDisableModalClose, onDisable]
  );

  const onChangeEnabledStatus = useCallback(
    async (enable: boolean) => {
      if (rule.enabled === enable) {
        return;
      }
      if (enable) {
        await onEnable();
      } else if (autoRecoverAlerts === false) {
        onDisable(false);
      } else {
        onDisableModalOpen();
      }
    },
    [rule.enabled, autoRecoverAlerts, onEnable, onDisableModalOpen, onDisable]
  );

  const badgeMessage = !rule.enabled ? DISABLED : isSnoozed ? SNOOZED : ENABLED;

  const remainingSnoozeTime =
    rule.enabled && isSnoozed ? (
      <EuiToolTip
        content={
          rule.muteAll
            ? INDEFINITELY
            : moment(new Date(rule.isSnoozedUntil!)).format(SNOOZE_END_TIME_FORMAT)
        }
      >
        <EuiText tabIndex={0} color="subdued" size="xs">
          {rule.muteAll ? INDEFINITELY : moment(new Date(rule.isSnoozedUntil!)).fromNow(true)}
        </EuiText>
      </EuiToolTip>
    ) : null;

  const handleSwitchChange = useCallback(
    (e: EuiSwitchEvent) => {
      onChangeEnabledStatus(e.target.checked);
    },
    [onChangeEnabledStatus]
  );

  const statusSwitch = (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      css={{ minHeight: 0 }}
    >
      <EuiFlexItem grow={false}>
        <EuiSwitch
          data-test-subj="ruleStatusDropdownSwitch"
          label={badgeMessage}
          showLabel={false}
          checked={rule.enabled}
          onChange={handleSwitchChange}
          disabled={isUpdating || !isEditable}
          aria-label={OPEN_MENU_ARIA_LABEL}
        />
      </EuiFlexItem>
      {isUpdating && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  const readOnlySwitch = (
    <EuiSwitch
      data-test-subj="statusDropdownReadonly"
      label={badgeMessage}
      showLabel={false}
      checked={rule.enabled}
      onChange={() => {}}
      disabled
      aria-label={badgeMessage}
    />
  );

  return (
    <>
      <EuiFlexGroup
        direction={direction}
        alignItems={direction === 'row' ? 'center' : 'flexStart'}
        justifyContent="flexStart"
        gutterSize={direction === 'row' ? 's' : 'xs'}
        responsive={false}
      >
        <EuiFlexItem grow={false} data-test-subj={`ruleType_${rule.ruleTypeId}`}>
          {isEditable ? statusSwitch : readOnlySwitch}
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="remainingSnoozeTime" grow={false}>
          {remainingSnoozeTime}
        </EuiFlexItem>
      </EuiFlexGroup>
      {isUntrackAlertsModalOpen && (
        <UntrackAlertsModal onConfirm={onModalConfirm} onCancel={onDisableModalClose} />
      )}
    </>
  );
};

export const futureTimeToInterval = (time?: Date | null) => {
  if (!time) return;
  const relativeTime = moment(time).locale('en').fromNow(true);
  const [valueStr, unitStr] = relativeTime.split(' ');
  let value = valueStr === 'a' || valueStr === 'an' ? 1 : parseInt(valueStr, 10);
  let unit;
  switch (unitStr) {
    case 'year':
    case 'years':
      unit = 'M';
      value = value * 12;
      break;
    case 'month':
    case 'months':
      unit = 'M';
      break;
    case 'day':
    case 'days':
      unit = 'd';
      break;
    case 'hour':
    case 'hours':
      unit = 'h';
      break;
    case 'minute':
    case 'minutes':
      unit = 'm';
      break;
  }

  if (!unit) return;
  return `${value}${unit}`;
};

const ENABLED = i18n.translate('xpack.triggersActionsUI.sections.rulesList.enabledRuleStatus', {
  defaultMessage: 'Enabled',
});

const DISABLED = i18n.translate('xpack.triggersActionsUI.sections.rulesList.disabledRuleStatus', {
  defaultMessage: 'Disabled',
});

const SNOOZED = i18n.translate('xpack.triggersActionsUI.sections.rulesList.snoozedRuleStatus', {
  defaultMessage: 'Snoozed',
});

const OPEN_MENU_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusDropdownMenuLabel',
  {
    defaultMessage: 'Change rule status or snooze',
  }
);

const INDEFINITELY = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.remainingSnoozeIndefinite',
  { defaultMessage: 'Indefinitely' }
);

// eslint-disable-next-line import/no-default-export
export { RuleStatusDropdown as default };
