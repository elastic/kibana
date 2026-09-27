/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiPopoverProps,
} from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  EuiWrappingPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { formatSnoozeFullDate } from './format_snooze_date';
import { isSnoozed } from './is_snoozed';
import { ActionPolicySnoozeModal } from './action_policy_snooze_modal';
import { ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE } from './labels';
import { useIsActionPoliciesLicenseValid } from '../../hooks/use_is_action_policies_license_valid';

interface Props {
  policy: ActionPolicyResponse;
  onViewDetails?: (policy: ActionPolicyResponse) => void;
  onEdit?: (id: string) => void;
  onClone: (policy: ActionPolicyResponse) => void;
  onDelete: (policy: ActionPolicyResponse) => void;
  onEnable?: (id: string) => void;
  onDisable?: (id: string) => void;
  isStateLoading?: boolean;
  onUpdateApiKey: (id: string) => void;
  isDisabled?: boolean;
  onSnooze?: (id: string, snoozedUntil: string) => void;
  onCancelSnooze?: (id: string) => void;
  isSnoozeLoading?: boolean;
  renderButton?: (args: { isOpen: boolean; toggle: () => void }) => React.ReactElement;
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  'data-test-subj'?: string;
  anchorId?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export const ActionPolicyActionsMenu = ({
  policy,
  onViewDetails,
  onEdit,
  onClone,
  onDelete,
  onEnable,
  onDisable,
  isStateLoading = false,
  onUpdateApiKey,
  isDisabled = false,
  onSnooze,
  onCancelSnooze,
  isSnoozeLoading = false,
  renderButton,
  anchorPosition = 'downRight',
  'data-test-subj': dataTestSubj,
  anchorId,
  isOpen,
  onOpenChange,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);

  const isControlled = isOpen !== undefined;
  const isPopoverOpen = isControlled ? isOpen! : uncontrolledIsOpen;
  const setIsPopoverOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledIsOpen(next);
    onOpenChange?.(next);
  };

  const togglePopover = () => setIsPopoverOpen(!isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const isLicenseValid = useIsActionPoliciesLicenseValid();
  const licenseTooltip = isLicenseValid ? undefined : ACTION_POLICIES_LICENSE_REQUIRED_MESSAGE;
  const isEnableBlockedByLicense = !policy.enabled && !isLicenseValid;

  const canSnooze = onSnooze != null && onCancelSnooze != null && policy.enabled;
  const snoozedActive = isSnoozed(policy.snoozed_until);

  const group1: EuiContextMenuPanelItemDescriptor[] = [];
  if (onViewDetails) {
    group1.push({
      name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.viewDetails', {
        defaultMessage: 'View details',
      }),
      icon: 'eye',
      'data-test-subj': `viewDetailsActionPolicy-${policy.id}`,
      onClick: () => {
        closePopover();
        onViewDetails(policy);
      },
    });
  }
  if (onEdit) {
    group1.push({
      name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.edit', {
        defaultMessage: 'Edit',
      }),
      icon: 'pencil',
      disabled: !isLicenseValid,
      toolTipContent: licenseTooltip,
      'data-test-subj': `editActionPolicy-${policy.id}`,
      onClick: () => {
        closePopover();
        onEdit(policy.id);
      },
    });
  }

  const group2: EuiContextMenuPanelItemDescriptor[] = [];
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
          closePopover();
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
          closePopover();
          setIsSnoozeModalOpen(true);
        },
      });
    }
  }
  group2.push({
    name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.clone', {
      defaultMessage: 'Clone',
    }),
    icon: 'copy',
    disabled: !isLicenseValid,
    toolTipContent: licenseTooltip,
    'data-test-subj': `cloneActionPolicy-${policy.id}`,
    onClick: () => {
      closePopover();
      onClone(policy);
    },
  });
  if (onEnable != null && onDisable != null) {
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
        closePopover();
        if (policy.enabled) {
          onDisable(policy.id);
        } else {
          onEnable(policy.id);
        }
      },
    });
  }
  group2.push({
    name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.updateApiKey', {
      defaultMessage: 'Update API key',
    }),
    icon: 'key',
    'data-test-subj': `updateApiKeyActionPolicy-${policy.id}`,
    onClick: () => {
      closePopover();
      onUpdateApiKey(policy.id);
    },
  });

  const group3: EuiContextMenuPanelItemDescriptor[] = [
    {
      name: i18n.translate('xpack.alertingV2.actionPoliciesList.action.delete', {
        defaultMessage: 'Delete',
      }),
      icon: 'trash',
      css: css`
        color: ${euiTheme.colors.textDanger};
      `,
      'data-test-subj': `deleteActionPolicy-${policy.id}`,
      onClick: () => {
        closePopover();
        onDelete(policy);
      },
    },
  ];

  const nonEmptyGroups = [group1, group2, group3].filter((g) => g.length > 0);

  const menuItems = nonEmptyGroups.reduce<EuiContextMenuPanelItemDescriptor[]>(
    (acc, group, index) => {
      if (index === 0) {
        return [...acc, ...group];
      }
      return [...acc, { isSeparator: true as const, key: `separator-${index}` }, ...group];
    },
    []
  );

  const panels: EuiContextMenuPanelDescriptor[] = [{ id: 0, items: menuItems }];

  const trigger = renderButton ? (
    renderButton({ isOpen: isPopoverOpen, toggle: togglePopover })
  ) : (
    <EuiToolTip
      content={i18n.translate('xpack.alertingV2.actionPoliciesList.action.more', {
        defaultMessage: 'More actions',
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="boxesVertical"
        color="text"
        aria-label={i18n.translate('xpack.alertingV2.actionPoliciesList.action.more', {
          defaultMessage: 'More actions',
        })}
        onClick={togglePopover}
        isDisabled={isDisabled}
        data-test-subj={dataTestSubj}
      />
    </EuiToolTip>
  );

  const popoverContent = <EuiContextMenu initialPanelId={0} panels={panels} />;
  const anchor = anchorId ? document.getElementById(anchorId) : null;

  const menuAriaLabel = i18n.translate('xpack.alertingV2.actionPoliciesList.action.actionsMenu', {
    defaultMessage: 'Action policy actions',
  });

  return (
    <>
      {anchorId ? (
        anchor && (
          <EuiWrappingPopover
            button={anchor}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition={anchorPosition}
            panelPaddingSize="s"
            aria-label={menuAriaLabel}
          >
            {popoverContent}
          </EuiWrappingPopover>
        )
      ) : (
        <EuiPopover
          aria-label={menuAriaLabel}
          button={trigger}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          anchorPosition={anchorPosition}
          panelPaddingSize="s"
        >
          {popoverContent}
        </EuiPopover>
      )}
      {isSnoozeModalOpen && (
        <ActionPolicySnoozeModal
          onApplySnooze={(snoozedUntil) => {
            onSnooze?.(policy.id, snoozedUntil);
            setIsSnoozeModalOpen(false);
          }}
          onCancel={() => setIsSnoozeModalOpen(false)}
        />
      )}
    </>
  );
};
