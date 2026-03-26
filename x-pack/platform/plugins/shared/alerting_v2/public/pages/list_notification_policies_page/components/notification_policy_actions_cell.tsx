/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  useEuiTheme,
  type EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { isSnoozed } from '../../../components/notification_policy/is_snoozed';
import {
  NotificationPolicySnoozeForm,
  formatSnoozeDate,
} from '../../../components/notification_policy/notification_policy_snooze_form';

interface NotificationPolicyActionsCellProps {
  policy: NotificationPolicyResponse;
  onEdit: (id: string) => void;
  onClone: (policy: NotificationPolicyResponse) => void;
  onDelete: (policy: NotificationPolicyResponse) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onSnooze: (id: string, snoozedUntil: string) => void;
  onCancelSnooze: (id: string) => void;
  onUpdateApiKey: (id: string) => void;
  isStateLoading: boolean;
  isDisabled?: boolean;
}

export const NotificationPolicyActionsCell = ({
  policy,
  onEdit,
  onClone,
  onDelete,
  onEnable,
  onDisable,
  onSnooze,
  onCancelSnooze,
  onUpdateApiKey,
  isStateLoading,
  isDisabled = false,
}: NotificationPolicyActionsCellProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  const snoozed = isSnoozed(policy.snoozedUntil);

  const snoozeItem = policy.enabled
    ? [
        {
          name: snoozed
            ? i18n.translate('xpack.alertingV2.notificationPoliciesList.action.snoozedUntil', {
                defaultMessage: 'Snoozed until {date}',
                values: { date: formatSnoozeDate(policy.snoozedUntil!) },
              })
            : i18n.translate('xpack.alertingV2.notificationPoliciesList.action.snooze', {
                defaultMessage: 'Snooze',
              }),
          icon: 'bellSlash',
          panel: 1,
        },
      ]
    : [];

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      items: [
        ...snoozeItem,
        ...(policy.enabled ? [{ isSeparator: true as const }] : []),
        {
          name: i18n.translate('xpack.alertingV2.notificationPoliciesList.action.edit', {
            defaultMessage: 'Edit',
          }),
          icon: 'pencil',
          onClick: () => {
            closePopover();
            onEdit(policy.id);
          },
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPoliciesList.action.clone', {
            defaultMessage: 'Clone',
          }),
          icon: 'copy',
          onClick: () => {
            closePopover();
            onClone(policy);
          },
        },
        {
          name: policy.enabled
            ? i18n.translate('xpack.alertingV2.notificationPoliciesList.action.disable', {
                defaultMessage: 'Disable',
              })
            : i18n.translate('xpack.alertingV2.notificationPoliciesList.action.enable', {
                defaultMessage: 'Enable',
              }),
          icon: policy.enabled ? 'stop' : 'play',
          disabled: isStateLoading,
          onClick: () => {
            closePopover();
            if (policy.enabled) {
              onDisable(policy.id);
            } else {
              onEnable(policy.id);
            }
          },
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPoliciesList.action.updateApiKey', {
            defaultMessage: 'Update API key',
          }),
          icon: 'key',
          onClick: () => {
            closePopover();
            onUpdateApiKey(policy.id);
          },
        },
        {
          name: i18n.translate('xpack.alertingV2.notificationPoliciesList.action.delete', {
            defaultMessage: 'Delete',
          }),
          icon: 'trash',
          css: css`
            color: ${euiTheme.colors.textDanger};
            padding: ${euiTheme.size.s};
          `,
          onClick: () => {
            closePopover();
            onDelete(policy);
          },
        },
      ],
    },
    {
      id: 1,
      title: (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon
              type="bellSlash"
              aria-label={i18n.translate(
                'xpack.alertingV2.notificationPoliciesList.action.snoozeNotifications.ariaLabel',
                { defaultMessage: 'Snooze notifications' }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate(
              'xpack.alertingV2.notificationPoliciesList.action.snoozeNotifications',
              { defaultMessage: 'Snooze notifications' }
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: 320,
      content: (
        <EuiPanel>
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
        </EuiPanel>
      ),
    },
  ];

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="pencil"
          color="text"
          aria-label={i18n.translate(
            'xpack.alertingV2.notificationPoliciesList.action.edit.description',
            { defaultMessage: 'Edit this notification policy' }
          )}
          onClick={() => onEdit(policy.id)}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={i18n.translate(
            'xpack.alertingV2.notificationPoliciesList.action.delete.description',
            { defaultMessage: 'Delete this notification policy' }
          )}
          onClick={() => onDelete(policy)}
          isDisabled={isDisabled}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="boxesHorizontal"
              color="text"
              aria-label={i18n.translate('xpack.alertingV2.notificationPoliciesList.action.more', {
                defaultMessage: 'More actions',
              })}
              onClick={togglePopover}
              isDisabled={isDisabled}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition="downRight"
          panelPaddingSize="s"
        >
          <EuiContextMenu initialPanelId={0} panels={panels} size="s" />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
