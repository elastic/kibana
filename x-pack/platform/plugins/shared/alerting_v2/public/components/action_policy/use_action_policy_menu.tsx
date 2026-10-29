/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { formatSnoozeFullDate } from './format_snooze_date';
import { useIsSnoozed } from './use_is_snoozed';
import { ActionPolicySnoozeModal } from './action_policy_snooze_modal';
import { ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE } from './labels';
import { SendTestNotificationFlyout } from './send_test_notification/send_test_notification_flyout';
import { SEND_TEST_NOTIFICATION } from './send_test_notification/translations';
import { useIsActionPoliciesLicenseValid } from '../../hooks/use_is_action_policies_license_valid';

export const ACTION_POLICY_MENU_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.actionPoliciesList.action.actionsMenu',
  { defaultMessage: 'Action policy actions' }
);

export interface UseActionPolicyMenuParams {
  policy: ActionPolicyResponse;
  onViewDetails?: (policy: ActionPolicyResponse) => void;
  onEdit?: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable?: (id: string) => void;
  onDisable?: (id: string) => void;
  isStateLoading?: boolean;
  onUpdateApiKey: (id: string) => void;
  onSnooze?: (id: string, snoozedUntil: string) => void;
  onCancelSnooze?: (id: string) => void;
  isSnoozeLoading?: boolean;
  /** Called before an item's action runs. Omit it when the menu closes itself on item click. */
  closeMenu?: () => void;
  /** Whether the write actions are offered. Defaults to `true`. */
  canWrite?: boolean;
  /** Whether the user can read action policies, which is enough to send a test notification. */
  canSendTestNotification?: boolean;
  /** History key of the flyout the menu lives in, shared with the test notification flyout. */
  flyoutHistoryKey?: symbol;
}

export interface UseActionPolicyMenuResult {
  /** Empty when no action is available to the user. */
  panels: FlyoutFooterMenuPanel[];
  /**
   * The snooze modal or the test notification flyout, or `null` while both are closed. Render it
   * outside the menu's popover.
   */
  modal: ReactNode;
}

export const useActionPolicyMenu = ({
  policy,
  onViewDetails,
  onEdit,
  onClone,
  onDelete,
  onEnable,
  onDisable,
  isStateLoading = false,
  onUpdateApiKey,
  onSnooze,
  onCancelSnooze,
  isSnoozeLoading = false,
  closeMenu,
  canWrite = true,
  canSendTestNotification = false,
  flyoutHistoryKey,
}: UseActionPolicyMenuParams): UseActionPolicyMenuResult => {
  const { euiTheme } = useEuiTheme();
  const isLicenseValid = useIsActionPoliciesLicenseValid();
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [isSendTestNotificationOpen, setIsSendTestNotificationOpen] = useState(false);
  const snoozedActive = useIsSnoozed(policy.snoozed_until);

  const panels = useMemo((): FlyoutFooterMenuPanel[] => {
    const licenseTooltip = isLicenseValid ? undefined : ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE;
    const isEnableBlockedByLicense = !policy.enabled && !isLicenseValid;
    const canSnooze = canWrite && onSnooze != null && onCancelSnooze != null && policy.enabled;

    const group1: FlyoutFooterMenuItem[] = [];
    if (onViewDetails) {
      group1.push({
        name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.viewDetails', {
          defaultMessage: 'View details',
        }),
        icon: 'eye',
        'data-test-subj': `viewDetailsActionPolicy-${policy.id}`,
        onClick: () => {
          closeMenu?.();
          onViewDetails(policy);
        },
      });
    }
    if (canWrite && onEdit) {
      group1.push({
        name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.edit', {
          defaultMessage: 'Edit',
        }),
        icon: 'pencil',
        disabled: !isLicenseValid,
        toolTipContent: licenseTooltip,
        'data-test-subj': `editActionPolicy-${policy.id}`,
        onClick: () => {
          closeMenu?.();
          onEdit(policy.id);
        },
      });
    }
    if (canSendTestNotification && isLicenseValid) {
      group1.push({
        name: SEND_TEST_NOTIFICATION,
        icon: 'send',
        'data-test-subj': `sendTestNotificationActionPolicy-${policy.id}`,
        onClick: () => {
          closeMenu?.();
          setIsSendTestNotificationOpen(true);
        },
      });
    }

    const group2: FlyoutFooterMenuItem[] = [];
    if (canSnooze) {
      if (snoozedActive && policy.snoozed_until != null) {
        group2.push({
          name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.unsnooze', {
            defaultMessage: 'Unsnooze',
          }),
          icon: 'bell',
          toolTipContent: formatSnoozeFullDate(policy.snoozed_until),
          disabled: isSnoozeLoading,
          'data-test-subj': `unsnoozeActionPolicy-${policy.id}`,
          onClick: () => {
            closeMenu?.();
            onCancelSnooze?.(policy.id);
          },
        });
      } else {
        group2.push({
          name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.snooze', {
            defaultMessage: 'Snooze',
          }),
          icon: 'bellSlash',
          disabled: isSnoozeLoading,
          'data-test-subj': `snoozeActionPolicy-${policy.id}`,
          onClick: () => {
            closeMenu?.();
            setIsSnoozeModalOpen(true);
          },
        });
      }
    }
    if (canWrite) {
      group2.push({
        name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.clone', {
          defaultMessage: 'Clone',
        }),
        icon: 'copy',
        disabled: !isLicenseValid,
        toolTipContent: licenseTooltip,
        'data-test-subj': `cloneActionPolicy-${policy.id}`,
        onClick: () => {
          closeMenu?.();
          onClone(policy);
        },
      });
    }
    if (canWrite && onEnable != null && onDisable != null) {
      group2.push({
        name: policy.enabled
          ? i18n.translate('xpack.alertingV2.actionPoliciesList.action.disable', {
              defaultMessage: 'Disable',
            })
          : i18n.translate('xpack.alertingV2.actionPoliciesList.action.enable', {
              defaultMessage: 'Enable',
            }),
        icon: policy.enabled ? 'stop' : 'play',
        disabled: isStateLoading || isEnableBlockedByLicense,
        toolTipContent: isEnableBlockedByLicense ? licenseTooltip : undefined,
        'data-test-subj': `toggleEnabledActionPolicy-${policy.id}`,
        onClick: () => {
          closeMenu?.();
          if (policy.enabled) {
            onDisable(policy.id);
          } else {
            onEnable(policy.id);
          }
        },
      });
    }
    if (canWrite) {
      group2.push({
        name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.updateApiKey', {
          defaultMessage: 'Update API key',
        }),
        icon: 'key',
        'data-test-subj': `updateApiKeyActionPolicy-${policy.id}`,
        onClick: () => {
          closeMenu?.();
          onUpdateApiKey(policy.id);
        },
      });
    }

    const group3: FlyoutFooterMenuItem[] = [];
    if (canWrite) {
      group3.push({
        name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.delete', {
          defaultMessage: 'Delete',
        }),
        icon: 'trash',
        css: css`
          color: ${euiTheme.colors.textDanger};
        `,
        'data-test-subj': `deleteActionPolicy-${policy.id}`,
        onClick: () => {
          closeMenu?.();
          onDelete(policy);
        },
      });
    }

    const items = [group1, group2, group3]
      .filter((group) => group.length > 0)
      .reduce<FlyoutFooterMenuItem[]>(
        (acc, group, index) =>
          index === 0
            ? [...acc, ...group]
            : [...acc, { isSeparator: true as const, key: `separator-${index}` }, ...group],
        []
      );

    return items.length > 0 ? [{ id: 0, items }] : [];
  }, [
    policy,
    onViewDetails,
    onEdit,
    onClone,
    onDelete,
    onEnable,
    onDisable,
    isStateLoading,
    onUpdateApiKey,
    onSnooze,
    onCancelSnooze,
    isSnoozeLoading,
    snoozedActive,
    closeMenu,
    canWrite,
    canSendTestNotification,
    isLicenseValid,
    euiTheme.colors.textDanger,
  ]);

  const sendTestNotificationFlyout = isSendTestNotificationOpen ? (
    <SendTestNotificationFlyout
      policy={policy}
      historyKey={flyoutHistoryKey}
      onClose={() => setIsSendTestNotificationOpen(false)}
    />
  ) : null;

  const modal = isSnoozeModalOpen ? (
    <ActionPolicySnoozeModal
      onApplySnooze={(snoozedUntil) => {
        onSnooze?.(policy.id, snoozedUntil);
        setIsSnoozeModalOpen(false);
      }}
      onCancel={() => setIsSnoozeModalOpen(false)}
    />
  ) : (
    sendTestNotificationFlyout
  );

  return { panels, modal };
};
