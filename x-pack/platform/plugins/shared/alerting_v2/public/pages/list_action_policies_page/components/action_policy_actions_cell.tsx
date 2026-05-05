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
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { isSnoozed } from '../../../components/action_policy/is_snoozed';
import {
  ActionPolicySnoozeForm,
  formatSnoozeDate,
} from '../../../components/action_policy/action_policy_snooze_form';

interface ActionPolicyActionsCellProps {
  policy: ActionPolicyResponse;
  onEdit: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onSnooze: (id: string, snoozedUntil: string) => void;
  onCancelSnooze: (id: string) => void;
  onUpdateApiKey: (id: string) => void;
  isStateLoading: boolean;
  isDisabled?: boolean;
}

export const ActionPolicyActionsCell = ({
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
}: ActionPolicyActionsCellProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);

  const snoozed = isSnoozed(policy.snoozedUntil);

  const snoozeItem = policy.enabled
    ? [
        {
          name: snoozed
            ? i18n.translate('xpack.alertingV2.actionPoliciesList.action.snoozedUntil', {
                defaultMessage: 'Snoozed until {date}',
                values: { date: formatSnoozeDate(policy.snoozedUntil!) },
              })
            : i18n.translate('xpack.alertingV2.actionPoliciesList.action.snooze', {
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
          name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.edit', {
            defaultMessage: 'Edit',
          }),
          icon: 'pencil',
          onClick: () => {
            closePopover();
            onEdit(policy.id);
          },
        },
        {
          name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.clone', {
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
            ? i18n.translate('xpack.alertingV2.actionPoliciesList.action.disable', {
                defaultMessage: 'Disable',
              })
            : i18n.translate('xpack.alertingV2.actionPoliciesList.action.enable', {
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
          name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.updateApiKey', {
            defaultMessage: 'Update API key',
          }),
          icon: 'key',
          onClick: () => {
            closePopover();
            onUpdateApiKey(policy.id);
          },
        },
        {
          name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.delete', {
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
                'xpack.alertingV2.actionPoliciesList.action.snoozeNotifications.ariaLabel',
                { defaultMessage: 'Snooze notifications' }
              )}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.alertingV2.actionPoliciesList.action.snoozeNotifications', {
              defaultMessage: 'Snooze notifications',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      width: 320,
      content: (
        <EuiPanel>
          <ActionPolicySnoozeForm
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
            'xpack.alertingV2.actionPoliciesList.action.edit.description',
            { defaultMessage: 'Edit this action policy' }
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
            'xpack.alertingV2.actionPoliciesList.action.delete.description',
            { defaultMessage: 'Delete this action policy' }
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
              aria-label={i18n.translate('xpack.alertingV2.actionPoliciesList.action.more', {
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
