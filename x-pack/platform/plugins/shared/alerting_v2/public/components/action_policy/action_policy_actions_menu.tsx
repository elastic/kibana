/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import { ACTION_POLICY_MENU_ARIA_LABEL, useActionPolicyMenu } from './use_action_policy_menu';

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
  'data-test-subj'?: string;
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
  'data-test-subj': dataTestSubj,
}: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((open) => !open);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const { panels, modal } = useActionPolicyMenu({
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
    closeMenu: closePopover,
  });

  return (
    <>
      <EuiPopover
        aria-label={ACTION_POLICY_MENU_ARIA_LABEL}
        button={
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
        }
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downRight"
        panelPaddingSize="s"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
      {modal}
    </>
  );
};
